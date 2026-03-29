/**
 * POST /api/renthop/sync  (GET also accepted for manual curl testing)
 *
 * Phase 1: Brooklyn-only, manual-trigger only, no cron.
 *
 * What this does:
 *   1. Fetches RentHop Brooklyn search results (internal XHR API, no Apify)
 *   2. Filters to confirmed-Brooklyn cards only (neighborhoodRaw check)
 *   3. Fetches each listing detail page (static HTML, no JS rendering)
 *   4. Normalizes via lib/renthop-normalize.ts
 *   5. Applies a second borough gate before upsert
 *   6. Upserts to the existing listings table on conflict original_url
 *
 * What this does NOT touch:
 *   - app/api/apify/*  (existing provider — no changes)
 *   - lib/apify-normalize.ts
 *   - vercel.json (no cron entry yet — Phase 2)
 *   - Any existing listing rows from the Apify pipeline
 *
 * Env vars used (same as existing routes — no new vars needed):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { NextResponse } from 'next/server';
import { createClient }  from '@supabase/supabase-js';
import { execFile }      from 'child_process';
import {
  normalizeRentHopListing,
  validateRentHopRow,
  type RentHopSearchStub,
  type RentHopRow,
} from '@/lib/renthop-normalize';
import type { DbRow } from '@/lib/apify-normalize';

export const dynamic    = 'force-dynamic';
export const maxDuration = 300; // 5 min — 20 listings × (2.5s delay + ~3s fetch) ≈ 110s

// ─── Phase 1 constants ────────────────────────────────────────────────────────

// Confirmed bounding box — returns 3,000+ Brooklyn listings in the search API
const BROOKLYN_MBR = '40.5715,-74.0421,40.7395,-73.8334';

// Hard borough gate. Any row whose resolved borough is not this value is
// rejected before upsert regardless of how it passed the search card filter.
const PHASE1_BOROUGH = 'Brooklyn';

// Caps for Phase 1.  MAX_LISTINGS is the total target; MAX_SEARCH_PAGES bounds
// how many search API pages are fetched to reach that target.
// Bump both in Phase 2 when the cron is added.
const MAX_LISTINGS    = 20;
const MAX_SEARCH_PAGES = 3;

// Polite inter-request delay. Cloudflare rate-limits aggressive crawlers;
// 2500ms is conservative and confirmed to work in local pipeline tests.
const DELAY_MS = 2500;

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── HTTP helper ──────────────────────────────────────────────────────────────

/**
 * Fetches a URL via curl subprocess.
 *
 * Why curl instead of Node.js https:
 *   Cloudflare inspects the TLS/JA3 fingerprint of incoming connections.
 *   Node.js's native https module produces a fingerprint that Cloudflare flags
 *   as non-browser and challenges. curl's TLS fingerprint passes consistently —
 *   confirmed in all spike tests that produced the validated pipeline data.
 */
function curlGet(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'User-Agent':      BROWSER_UA,
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection':      'keep-alive',
      ...extraHeaders,
    };

    const args: string[] = [
      '-s',                    // silent
      '-L',                    // follow redirects
      '--max-time',    '20',
      '--max-redirs',  '3',
      '--compressed',
    ];

    for (const [k, v] of Object.entries(headers)) {
      args.push('-H', `${k}: ${v}`);
    }
    args.push(url);

    execFile('curl', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(new Error(`curl error: ${err.message}`));
      // Cloudflare JS challenge page — not a valid HTML/JSON response
      if (stdout.includes('Just a moment') || stdout.includes('cf-browser-verification')) {
        return reject(new Error(`Cloudflare challenge at ${url}`));
      }
      resolve(stdout);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Search page fetcher ──────────────────────────────────────────────────────

type SearchResult = { html: string; numFound: number; numPages: number };

async function fetchSearchPage(page: number): Promise<SearchResult> {
  const url = new URL('https://www.renthop.com/r/listings/search_map_query');
  url.searchParams.set('mbr',       BROOKLYN_MBR);
  // sort=newest keeps results geographically local to the bounding box.
  // sort=hopscore is a national ranking that ignores the bbox and surfaces
  // Manhattan listings on every page — confirmed non-viable in pipeline tests.
  url.searchParams.set('sort',      'newest');
  url.searchParams.set('has_photo', '1');
  url.searchParams.set('page',      String(page));

  const body = await curlGet(url.toString(), {
    'Accept':           'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer':          'https://www.renthop.com/apartments-for-rent/brooklyn-ny',
  });

  const data = JSON.parse(body) as {
    results?: { html?: string; num_found?: number; num_pages?: number };
    status_text?: string;
  };

  if (!data.results?.html) {
    throw new Error(
      `RentHop search page ${page} returned no html — status: ${data.status_text ?? 'unknown'}`
    );
  }

  return {
    html:     data.results.html,
    numFound: data.results.num_found ?? 0,
    numPages: data.results.num_pages ?? 0,
  };
}

// ─── Search card parser ───────────────────────────────────────────────────────

/**
 * Parses listing stubs from the search API HTML fragment.
 * Only returns stubs that are confirmed to be in the target borough.
 *
 * @param html    HTML fragment from the search API response
 * @param limit   Max stubs to return from this page
 */
function parseSearchCards(html: string, limit: number): RentHopSearchStub[] {
  const blocks = html.split('search-map-listing').slice(1);
  const stubs: RentHopSearchStub[] = [];

  for (const block of blocks) {
    if (stubs.length >= limit) break;

    // Layer 1 bleed protection: skip Featured/promoted listings.
    // Featured cards are paid placements that appear on every page regardless
    // of the bounding box — they are almost always Manhattan.
    if (/class="font-white[^"]*"[^>]*>\s*Featured\s*</.test(block)) continue;

    const urlMatch = block.match(/href="(https:\/\/www\.renthop\.com\/listings\/[^"]+)"/);
    if (!urlMatch) continue;

    const neighMatch      = block.match(/neighborhoods[^>]+>\s*\n?\s*([^\n<]{5,120})/);
    const neighborhoodRaw = neighMatch ? neighMatch[1].trim() : null;

    // Layer 2 bleed protection: require the target borough name in the
    // neighborhood string. The bounding box is a soft geographic filter — it
    // returns off-borough listings sorted by recency. Only cards that
    // explicitly name the borough are included.
    if (!neighborhoodRaw || !neighborhoodRaw.toLowerCase().includes(PHASE1_BOROUGH.toLowerCase())) {
      continue;
    }

    const imgMatch   = block.match(/src="(https:\/\/photos\.renthop\.com\/[^"]+)"/);
    const addrMatch  = block.match(/class="font-size-12 b"[^>]+>\s*\n?\s*([^\n<]{5,80})/);
    const priceMatch = block.match(/font-size-20[^>]+>\s*(\$[\d,]+)/);
    const bedsMatch  = block.match(/>\s*([0-9]+BR|Studio)\s*</);

    stubs.push({
      listingUrl:      urlMatch[1],
      imageUrl:        imgMatch   ? imgMatch[1]         : null,
      addressTitle:    addrMatch  ? addrMatch[1].trim()  : null,
      price:           priceMatch ? priceMatch[1].trim() : null,
      beds:            bedsMatch  ? bedsMatch[1].trim()  : null,
      neighborhoodRaw,
    });
  }

  return stubs;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  // ── Step 1: Collect Brooklyn stubs (paginate until MAX_LISTINGS or MAX_PAGES) ─

  const allStubs: RentHopSearchStub[] = [];
  let numFound = 0;

  for (let page = 1; page <= MAX_SEARCH_PAGES && allStubs.length < MAX_LISTINGS; page++) {
    if (page > 1) await sleep(DELAY_MS);

    let result: SearchResult;
    try {
      result = await fetchSearchPage(page);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[RentHop] Search page ${page} failed: ${msg}`);
      break; // stop paginating; process stubs collected so far
    }

    if (page === 1) numFound = result.numFound;

    const pageStubs = parseSearchCards(result.html, MAX_LISTINGS - allStubs.length);
    allStubs.push(...pageStubs);

    console.log(
      `[RentHop] Page ${page}/${result.numPages}: ${pageStubs.length} Brooklyn stubs ` +
      `(running total: ${allStubs.length})`
    );

    if (result.numPages <= page) break; // no more pages available
  }

  if (allStubs.length === 0) {
    return NextResponse.json({
      status:     'no_stubs',
      borough:    PHASE1_BOROUGH,
      numFound,
      message:    'No Brooklyn listings found in search results — page structure may have changed',
      attempted:  0,
      normalized: 0,
      valid:      0,
      upserted:   0,
      skipped:    0,
    });
  }

  // ── Step 2: Fetch detail pages, normalize, validate ───────────────────────

  const dbRows:   DbRow[]   = [];
  const seenUrls            = new Set<string>();
  const errors:   string[]  = [];
  let normalizedCount       = 0;
  let skipped               = 0;

  for (let i = 0; i < allStubs.length; i++) {
    const stub = allStubs[i];

    await sleep(DELAY_MS);

    // Fetch detail page HTML
    let html: string;
    try {
      html = await curlGet(stub.listingUrl, {
        'Referer': 'https://www.renthop.com/apartments-for-rent/brooklyn-ny',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`fetch failed — ${stub.listingUrl}: ${msg}`);
      skipped++;
      continue;
    }

    // Normalize
    let row: RentHopRow;
    try {
      row = normalizeRentHopListing(html, stub);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`normalize error — ${stub.listingUrl}: ${msg}`);
      skipped++;
      continue;
    }

    normalizedCount++;

    // Layer 3 bleed protection: reject any row that resolved to a borough other
    // than Brooklyn, even if it passed the search card filter. This catches edge
    // cases where JSON-LD contains a different addressLocality than expected.
    if (row.borough !== PHASE1_BOROUGH) {
      errors.push(`bleed rejected — ${stub.listingUrl}: resolved borough = "${row.borough}"`);
      skipped++;
      continue;
    }

    // Validate minimum DbRow requirements
    const { valid, issues } = validateRentHopRow(row);
    if (!valid) {
      errors.push(`validation failed — ${stub.listingUrl}: ${issues.join(', ')}`);
      skipped++;
      continue;
    }

    // Deduplicate within this run
    if (seenUrls.has(row.original_url)) {
      skipped++;
      continue;
    }
    seenUrls.add(row.original_url);

    // Strip fields not yet in the DB schema.
    //
    // `source` and `petDetail` are produced by normalizeRentHopListing but the
    // corresponding columns do not exist in the listings table yet.
    // They are stripped here and re-enabled in Phase 2 after running:
    //   ALTER TABLE listings ADD COLUMN source TEXT;
    //
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { source: _src, petDetail: _pd, ...dbRow } = row;

    // Unlike the existing Apify collect route, RentHop writes neighborhood,
    // pets, and description. The Apify route strips those fields to protect
    // manually curated DB values. RentHop rows are new inserts — no curated
    // values exist to protect, and RentHop's pet and neighborhood data is
    // reliable enough to write directly.
    dbRows.push(dbRow);

    console.log(
      `[RentHop] [${i + 1}/${allStubs.length}] ` +
      `${row.address} | $${row.price} | ${row.bedrooms}BR/${row.bathrooms}ba | pets=${row.pets}`
    );
  }

  // ── Step 3: Upsert ────────────────────────────────────────────────────────

  let upserted    = 0;
  let dbError: string | null = null;

  if (dbRows.length > 0) {
    const { error } = await db
      .from('listings')
      .upsert(dbRows, { onConflict: 'original_url', ignoreDuplicates: false });

    if (error) {
      console.error('[RentHop] Supabase upsert error:', error.message);
      dbError = error.message;
    } else {
      upserted = dbRows.length;
      console.log(`[RentHop] Upserted ${upserted} listings to Supabase`);
    }
  }

  return NextResponse.json({
    status:     dbError ? 'error' : 'ok',
    borough:    PHASE1_BOROUGH,
    numFound,
    attempted:  allStubs.length,
    normalized: normalizedCount,
    valid:      dbRows.length,
    upserted,
    skipped,
    ...(errors.length > 0 && { errors }),
    ...(dbError        && { dbError }),
  });
}

export async function GET()  { return handler(); }
export async function POST() { return handler(); }

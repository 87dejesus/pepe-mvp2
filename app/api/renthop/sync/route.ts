/**
 * POST /api/renthop/sync  (GET also accepted for manual curl testing)
 *
 * Multi-borough sync: Manhattan, Brooklyn, Bronx, Queens (no Staten Island).
 * Manual-trigger only, no cron.
 *
 * What this does:
 *   1. Iterates over 4 NYC boroughs sequentially
 *   2. For each borough: fetches RentHop search results using a bounding box
 *   3. Filters to confirmed-borough cards only (neighborhoodRaw check)
 *   4. Fetches each listing detail page (static HTML, no JS rendering)
 *   5. Normalizes via lib/renthop-normalize.ts
 *   6. Applies a second borough gate before upsert
 *   7. Upserts to the existing listings table on conflict original_url
 *
 * What this does NOT touch:
 *   - app/api/apify/*  (existing provider — no changes)
 *   - lib/apify-normalize.ts
 *   - vercel.json (no cron entry yet — Phase 2)
 *   - Any existing listing rows from the Apify pipeline
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   RENTHOP_PROXY_URL          (required) — full HTTP proxy URL for RentHop fetches,
 *                               e.g. http://scraperapi:API_KEY@proxy-server.scraperapi.com:8001
 *                               Needed because Cloudflare blocks Vercel's AWS IP range.
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
export const maxDuration = 300; // 5 min — 4 boroughs × 10 listings, extra search pages for Bronx/Queens

// ─── Borough configuration ───────────────────────────────────────────────────

type BoroughConfig = {
  name: string;
  mbr: string;        // bounding box: south,west,north,east
  referer: string;    // slug used in Referer header
  maxPages: number;   // search pages to scan (higher for low-yield boroughs)
};

// MBR-based search bleeds across borough boundaries. Manhattan and Brooklyn have
// high yield (~10/14 cards match), but Bronx and Queens yield only ~2/14 cards
// per page because their bounding boxes overlap Manhattan heavily. maxPages is
// set per borough to compensate: ~7 pages × 2 matches ≈ 14 candidates → 10 target.
const BOROUGHS: BoroughConfig[] = [
  { name: 'Manhattan', mbr: '40.6996,-74.0201,40.8821,-73.9070', referer: 'manhattan-ny', maxPages: 2 },
  { name: 'Brooklyn',  mbr: '40.5715,-74.0421,40.7395,-73.8334', referer: 'brooklyn-ny',  maxPages: 2 },
  { name: 'Bronx',     mbr: '40.8000,-73.9200,40.9100,-73.8000', referer: 'bronx-ny',     maxPages: 7 },
  { name: 'Queens',    mbr: '40.5415,-73.9623,40.8012,-73.7004', referer: 'queens-ny',    maxPages: 7 },
];

const MAX_LISTINGS_PER_BOROUGH = 10;

// Polite inter-request delay. Cloudflare rate-limits aggressive crawlers;
// 2500ms is conservative and confirmed to work in local pipeline tests.
const DELAY_MS = 2500;

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// HTTP proxy URL for RentHop fetches. Required in production — Cloudflare blocks
// Vercel's AWS datacenter IP range. Must be a full proxy URL including credentials,
// e.g. http://scraperapi:API_KEY@proxy-server.scraperapi.com:8001
// Any provider that accepts HTTP CONNECT proxy auth will work.
const RENTHOP_PROXY_URL = process.env.RENTHOP_PROXY_URL ?? null;

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

    // Route through the scraping proxy when configured.
    // The proxy provides a residential IP that passes Cloudflare's bot filter.
    // -k skips SSL certificate verification — the proxy's MITM cert is not in
    // the system trust store, so curl exits 60 without it.
    if (RENTHOP_PROXY_URL) {
      args.push('--proxy', RENTHOP_PROXY_URL, '-k');
    }

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

async function fetchSearchPage(page: number, borough: BoroughConfig): Promise<SearchResult> {
  const url = new URL('https://www.renthop.com/r/listings/search_map_query');
  url.searchParams.set('mbr',       borough.mbr);
  // sort=newest keeps results geographically local to the bounding box.
  // sort=hopscore is a national ranking that ignores the bbox and surfaces
  // off-borough listings on every page — confirmed non-viable in pipeline tests.
  url.searchParams.set('sort',      'newest');
  url.searchParams.set('has_photo', '1');
  url.searchParams.set('page',      String(page));

  const body = await curlGet(url.toString(), {
    'Accept':           'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer':          `https://www.renthop.com/apartments-for-rent/${borough.referer}`,
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
 * @param html        HTML fragment from the search API response
 * @param limit       Max stubs to return from this page
 * @param boroughName Borough name for bleed protection filter
 */
function parseSearchCards(html: string, limit: number, boroughName: string): RentHopSearchStub[] {
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
    if (!neighborhoodRaw || !neighborhoodRaw.toLowerCase().includes(boroughName.toLowerCase())) {
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
  // RENTHOP_PROXY_URL is required — Cloudflare blocks Vercel's AWS datacenter IPs.
  // The route will not attempt any RentHop fetches without a proxy configured.
  if (!RENTHOP_PROXY_URL) {
    return NextResponse.json(
      {
        error: 'RENTHOP_PROXY_URL is not set. RentHop fetches require a scraping proxy ' +
               'because Cloudflare blocks Vercel\'s AWS IP range. ' +
               'Set RENTHOP_PROXY_URL in Vercel environment variables.',
      },
      { status: 500 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  // ── Per-borough tracking ──────────────────────────────────────────────────

  type BoroughResult = {
    borough: string;
    numFound: number;
    attempted: number;
    normalized: number;
    valid: number;
    upserted: number;
    skipped: number;
    errors: string[];
  };

  const boroughResults: BoroughResult[] = [];
  const allDbRows: DbRow[] = [];
  const seenUrls = new Set<string>();

  // ── Step 1 & 2: For each borough, collect stubs then fetch details ────────

  for (const borough of BOROUGHS) {
    const br: BoroughResult = {
      borough:    borough.name,
      numFound:   0,
      attempted:  0,
      normalized: 0,
      valid:      0,
      upserted:   0,
      skipped:    0,
      errors:     [],
    };

    console.log(`[RentHop] ── Starting ${borough.name} ──`);

    // Collect stubs for this borough
    const stubs: RentHopSearchStub[] = [];

    for (let page = 1; page <= borough.maxPages && stubs.length < MAX_LISTINGS_PER_BOROUGH; page++) {
      if (page > 1 || boroughResults.length > 0) await sleep(DELAY_MS);

      let result: SearchResult;
      try {
        result = await fetchSearchPage(page, borough);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[RentHop] ${borough.name} search page ${page} failed: ${msg}`);
        br.errors.push(`search page ${page}: ${msg}`);
        break;
      }

      if (page === 1) br.numFound = result.numFound;

      const pageStubs = parseSearchCards(result.html, MAX_LISTINGS_PER_BOROUGH - stubs.length, borough.name);
      stubs.push(...pageStubs);

      console.log(
        `[RentHop] ${borough.name} page ${page}/${result.numPages}: ${pageStubs.length} stubs ` +
        `(running total: ${stubs.length})`
      );

      if (result.numPages <= page) break;
    }

    br.attempted = stubs.length;

    if (stubs.length === 0) {
      console.log(`[RentHop] ${borough.name}: no stubs found, skipping detail fetch`);
      boroughResults.push(br);
      continue;
    }

    // Fetch detail pages, normalize, validate
    for (let i = 0; i < stubs.length; i++) {
      const stub = stubs[i];

      await sleep(DELAY_MS);

      let html: string;
      try {
        html = await curlGet(stub.listingUrl, {
          'Referer': `https://www.renthop.com/apartments-for-rent/${borough.referer}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        br.errors.push(`fetch failed — ${stub.listingUrl}: ${msg}`);
        br.skipped++;
        continue;
      }

      let row: RentHopRow;
      try {
        row = normalizeRentHopListing(html, stub);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        br.errors.push(`normalize error — ${stub.listingUrl}: ${msg}`);
        br.skipped++;
        continue;
      }

      br.normalized++;

      // Layer 3 bleed protection: reject rows that resolved to a different borough
      if (row.borough !== borough.name) {
        br.errors.push(`bleed rejected — ${stub.listingUrl}: resolved borough = "${row.borough}"`);
        br.skipped++;
        continue;
      }

      const { valid, issues } = validateRentHopRow(row);
      if (!valid) {
        br.errors.push(`validation failed — ${stub.listingUrl}: ${issues.join(', ')}`);
        br.skipped++;
        continue;
      }

      if (seenUrls.has(row.original_url)) {
        br.skipped++;
        continue;
      }
      seenUrls.add(row.original_url);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source: _src, petDetail: _pd, ...dbRow } = row;
      allDbRows.push(dbRow);
      br.valid++;

      console.log(
        `[RentHop] ${borough.name} [${i + 1}/${stubs.length}] ` +
        `${row.address} | $${row.price} | ${row.bedrooms}BR/${row.bathrooms}ba | pets=${row.pets}`
      );
    }

    boroughResults.push(br);
  }

  // ── Step 3: Upsert all rows ───────────────────────────────────────────────

  let totalUpserted = 0;
  let dbError: string | null = null;

  if (allDbRows.length > 0) {
    const { error } = await db
      .from('listings')
      .upsert(allDbRows, { onConflict: 'original_url', ignoreDuplicates: false });

    if (error) {
      console.error('[RentHop] Supabase upsert error:', error.message);
      dbError = error.message;
    } else {
      totalUpserted = allDbRows.length;
      console.log(`[RentHop] Upserted ${totalUpserted} listings to Supabase`);
    }
  }

  // Distribute upsert count back to borough results
  if (totalUpserted > 0) {
    for (const br of boroughResults) {
      br.upserted = br.valid; // each valid row was upserted
    }
  }

  // Build totals
  const totals = {
    attempted:  boroughResults.reduce((s, b) => s + b.attempted, 0),
    normalized: boroughResults.reduce((s, b) => s + b.normalized, 0),
    valid:      boroughResults.reduce((s, b) => s + b.valid, 0),
    upserted:   totalUpserted,
    skipped:    boroughResults.reduce((s, b) => s + b.skipped, 0),
  };

  // Collect all errors across boroughs
  const allErrors = boroughResults.flatMap(b =>
    b.errors.map(e => `[${b.borough}] ${e}`)
  );

  // Clean up borough results for response (omit empty error arrays)
  const boroughs = boroughResults.map(({ errors: errs, ...rest }) => ({
    ...rest,
    ...(errs.length > 0 && { errors: errs }),
  }));

  return NextResponse.json({
    status: dbError ? 'error' : totals.valid === 0 ? 'no_stubs' : 'ok',
    ...totals,
    boroughs,
    ...(allErrors.length > 0 && { errors: allErrors }),
    ...(dbError && { dbError }),
  });
}

export async function GET()  { return handler(); }
export async function POST() { return handler(); }

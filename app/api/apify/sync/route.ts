/**
 * POST /api/apify/sync
 *
 * Fetches listings from the Apify Zillow ZIP Code Search dataset,
 * normalizes each item to the app's Listing schema, upserts to Supabase,
 * and returns the normalized listings to the calling client.
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred — allows write without RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback — needs INSERT RLS policy)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Add APIFY_TOKEN to Vercel env vars (server-only, no NEXT_PUBLIC_ prefix).
// Add APIFY_DATASET_ID to override the default dataset.
const APIFY_DATASET_ID = process.env.APIFY_DATASET_ID ?? 'BYtjrj1gsjQozwHyT';

function buildApifyUrl(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN env var is not set');
  return `https://api.apify.com/v2/datasets/${APIFY_DATASET_ID}/items?token=${token}&clean=true`;
}

// ─── Borough detection ────────────────────────────────────────────────────────

const BOROUGH_MAP: Record<string, string> = {
  'new york': 'Manhattan',
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  bronx: 'Bronx',
  'the bronx': 'Bronx',
  'staten island': 'Staten Island',
};

// Queens is tricky — Zillow lists neighborhood names as the city
const QUEENS_CITIES = new Set([
  'astoria', 'long island city', 'lic', 'flushing', 'jackson heights',
  'forest hills', 'rego park', 'woodside', 'sunnyside', 'elmhurst',
  'jamaica', 'ridgewood', 'bayside', 'kew gardens', 'queens village',
  'ozone park', 'south ozone park', 'howard beach', 'corona',
  'richmond hill', 'maspeth', 'middle village', 'queens',
]);

function detectBorough(city: string, state: string): string {
  if (!city) return 'Unknown';
  const c = city.toLowerCase().trim();
  if (BOROUGH_MAP[c]) return BOROUGH_MAP[c];
  if (state === 'NY' && QUEENS_CITIES.has(c)) return 'Queens';
  // Non-NYC (e.g., Jersey City) — use city name as borough label
  return city;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAmenities(flex?: string): string[] {
  if (!flex || /price\s*(cut|red)/i.test(flex)) return [];
  return flex.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  const n = parseInt(String(val ?? '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ApifyItem = {
  zpid?: string | number;
  id?: string | number;
  unformattedPrice?: number;
  price?: string | number;
  beds?: number;
  baths?: number;
  imgSrc?: string;
  detailUrl?: string;
  address?: string;
  addressCity?: string;
  addressState?: string;
  statusText?: string;
  flexFieldText?: string;
  hdpData?: {
    homeInfo?: {
      bedrooms?: number;
      bathrooms?: number;
      livingArea?: number;
      priceReduction?: string;
    };
  };
};

// Fields safe to INSERT into Supabase listings table
type DbRow = {
  address: string;
  neighborhood: string;
  borough: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  image_url: string;
  original_url: string;
  pets: string;
  status: string;
};

// Full listing returned to the React client (includes amenities, images, id)
export type ApifyListing = DbRow & {
  id: string;
  amenities: string[];
  images: string[];
};

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeItem(item: ApifyItem): ApifyListing | null {
  // Price
  const price = toNumber(item.unformattedPrice ?? item.price);
  if (price <= 0) return null;

  // Location
  const city = item.addressCity ?? '';
  const state = item.addressState ?? '';
  const borough = detectBorough(city, state);
  const neighborhood = city;

  // Beds / baths (prefer top-level shorthand, fall back to hdpData)
  const homeInfo = item.hdpData?.homeInfo;
  const bedrooms = item.beds ?? homeInfo?.bedrooms ?? 0;
  const bathrooms = item.baths ?? homeInfo?.bathrooms ?? 1;

  // Description
  const flex = item.flexFieldText;
  const descParts: string[] = [];
  if (item.statusText) descParts.push(item.statusText);
  if (flex && !/price\s*(cut|red)/i.test(flex)) descParts.push(flex);
  if (homeInfo?.livingArea) descParts.push(`${homeInfo.livingArea.toLocaleString()} sq ft`);
  if (homeInfo?.priceReduction) descParts.push(`Price reduced: ${homeInfo.priceReduction}`);
  const description = descParts.join('. ');

  // Listing URL — detailUrl from Apify is already fully-qualified for Zillow
  const rawUrl = item.detailUrl ?? '';
  const original_url = rawUrl.startsWith('http')
    ? rawUrl
    : rawUrl ? `https://www.zillow.com${rawUrl}` : '';
  if (!original_url) return null;

  // Image
  const image_url = item.imgSrc ?? '';
  if (!image_url) return null;

  const id = String(item.zpid ?? item.id ?? `apify-${Math.random().toString(36).slice(2)}`);

  return {
    id,
    address: item.address ?? '',
    neighborhood,
    borough,
    price,
    bedrooms,
    bathrooms,
    description,
    image_url,
    original_url,
    pets: 'unknown',
    status: 'Active',
    amenities: parseAmenities(flex),
    images: [],
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role key (bypass RLS for writes); fall back to anon key
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured', listings: [] }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch raw items from Apify dataset
  let raw: ApifyItem[] = [];
  try {
    const apifyUrl = buildApifyUrl(); // throws if APIFY_TOKEN is missing
    const res = await fetch(apifyUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${res.statusText}`);
    raw = (await res.json()) as ApifyItem[];
    console.log(`[Steady Debug] Apify: fetched ${raw.length} raw items`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Steady Debug] Apify fetch failed:', msg);
    // Return empty so DecisionClient falls back to Supabase/mocks
    return NextResponse.json({ error: msg, listings: [], synced: 0 }, { status: 200 });
  }

  // 2. Normalize — filter out items missing price, URL, or image
  const normalized: ApifyListing[] = raw
    .map(normalizeItem)
    .filter((x): x is ApifyListing => x !== null);
  console.log(`[Steady Debug] Apify: normalized ${normalized.length}/${raw.length} items`);

  // 3. Upsert to Supabase (DB-safe fields only — no id/amenities/images)
  let synced = 0;
  let dbError: string | null = null;

  if (normalized.length > 0) {
    const dbRows: DbRow[] = normalized.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _id, amenities: _am, images: _im, ...rest }) => rest
    );

    const { error } = await db
      .from('listings')
      .upsert(dbRows, {
        onConflict: 'original_url',  // requires UNIQUE constraint on listings(original_url)
        ignoreDuplicates: false,     // update existing rows with fresh data
      });

    if (error) {
      console.error('[Steady Debug] Supabase upsert error:', error.message);
      dbError = error.message;
      // Non-fatal: we still return the listings to the client
    } else {
      synced = dbRows.length;
      console.log(`[Steady Debug] Apify: upserted ${synced} listings to Supabase`);
    }
  }

  return NextResponse.json({ listings: normalized, synced, dbError });
}

/**
 * POST /api/apify/sync
 *
 * Runs the Apify Apartments.com scraper (epctex/apartments-scraper-api),
 * normalizes each item to the app's Listing schema, upserts to Supabase,
 * and returns the normalized listings to the calling client.
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred — allows write without RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback — needs INSERT RLS policy)
 *   APIFY_TOKEN                     (required for live runs)
 *   APIFY_ACTOR_ID                  (optional — overrides default actor)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'epctex~apartments-scraper-api';

async function runApifyActor(): Promise<ApartmentsItem[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN env var is not set');

  const body = JSON.stringify({
    startUrls: [
      'https://www.apartments.com/new-york-ny/',
      'https://www.apartments.com/brooklyn-ny/',
      'https://www.apartments.com/bronx-ny/',
      'https://www.apartments.com/queens-ny/',
      'https://www.apartments.com/staten-island-ny/',
    ],
    includeReviews: false,
    includeVisuals: false,
    includeInteriorAmenities: true,
    includeWalkScore: false,
    maxItems: 200,
  });

  // 1. Start the run asynchronously
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store' }
  );
  if (!startRes.ok) throw new Error(`Apify start HTTP ${startRes.status}: ${startRes.statusText}`);
  const startData = await startRes.json();
  const runId: string = startData?.data?.id;
  if (!runId) throw new Error('Apify run start did not return a runId');
  console.log(`[Steady Debug] Apify run started: ${runId}`);

  // 2. Poll until SUCCEEDED or FAILED (max 10 attempts × 5s = 50s)
  const MAX_ATTEMPTS = 50;
  const POLL_INTERVAL_MS = 5000;
  let status = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      { cache: 'no-store' }
    );
    if (!pollRes.ok) throw new Error(`Apify poll HTTP ${pollRes.status}: ${pollRes.statusText}`);
    const pollData = await pollRes.json();
    status = pollData?.data?.status ?? '';
    console.log(`[Steady Debug] Apify run ${runId} — attempt ${attempt}/${MAX_ATTEMPTS}: ${status}`);
    if (status === 'SUCCEEDED' || status === 'FAILED') break;
  }

  if (status !== 'SUCCEEDED') throw new Error(`Apify run ${runId} ended with status: ${status}`);

  // 3. Fetch dataset items
  const itemsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&clean=true`,
    { cache: 'no-store' }
  );
  if (!itemsRes.ok) throw new Error(`Apify items HTTP ${itemsRes.status}: ${itemsRes.statusText}`);
  return (await itemsRes.json()) as ApartmentsItem[];
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

// Queens is tricky — Apartments.com lists neighborhood names as the city
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

function parsePets(item: ApartmentsItem): string {
  if (item.petFriendly === true)  return 'Allowed';
  if (item.petFriendly === false) return 'Not allowed';
  if (item.petPolicy) {
    const t = item.petPolicy.toLowerCase();
    if (/yes|allowed|ok|welcome/i.test(t))  return 'Allowed';
    if (/no|not\s*allowed|none/i.test(t))   return 'Not allowed';
  }
  return 'Unknown';
}

function cleanNeighborhood(item: ApartmentsItem, borough: string): string {
  // 1. Prefer location.neighborhood if present and clean
  const nb = (item.location?.neighborhood ?? '').trim();
  if (nb && nb.length <= 60) return nb;

  // 2. Try location.city with cleanliness checks
  const raw = (item.location?.city ?? '').trim();
  if (!raw) return borough;
  if (raw.includes('$')) return borough;           // price blob
  const firstLine = raw.includes('\n') ? raw.split('\n')[0].trim() : raw;
  if (firstLine.length > 60) return borough;       // title blob
  return firstLine || borough;
}

function parseBedrooms(beds?: string): number {
  if (!beds) return 0;
  const b = beds.toLowerCase().trim();
  if (b.includes('studio')) return 0;
  // Take the minimum from ranges like "1 bd - 2 bd"
  const match = b.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseBathrooms(baths?: string): number {
  if (!baths) return 1;
  // Take the minimum from ranges like "1 - 2 ba"
  const match = baths.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function parseAmenities(list?: Array<{ title: string; value: string[] }>): string[] {
  if (!list) return [];
  return list.flatMap((group) => group.value).map((s) => s.trim()).filter(Boolean);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ApartmentsItem = {
  id?: string;
  propertyName?: string;
  url?: string;
  location?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
    postalCode?: string;
    streetAddress?: string;
  };
  rent?: { min?: number; max?: number };
  beds?: string;
  baths?: string;
  sqft?: string;
  description?: string;
  contact?: { phone?: string; name?: string };
  amenities?: Array<{ title: string; value: string[] }>;
  petPolicy?: string;
  petFriendly?: boolean;
  images?: string[];
  rating?: number;
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

function normalizeItem(item: ApartmentsItem): ApifyListing | null {
  // Price
  const price = item.rent?.min ?? 0;
  if (price <= 0) return null;

  // Location
  const city  = item.location?.city  ?? '';
  const state = item.location?.state ?? '';
  const borough      = detectBorough(city, state);
  const neighborhood = cleanNeighborhood(item, borough);

  // Beds / baths
  const bedrooms  = parseBedrooms(item.beds);
  const bathrooms = parseBathrooms(item.baths);

  // URL (required); image is optional
  const original_url = item.url ?? '';
  if (!original_url) return null;

  const image_url = item.images?.[0] ?? '';

  const id = item.id ?? `apts-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    address:      item.location?.fullAddress ?? '',
    neighborhood,
    borough,
    price,
    bedrooms,
    bathrooms,
    description:  item.description ?? '',
    image_url,
    original_url,
    pets:         parsePets(item),
    status:       'Active',
    amenities:    parseAmenities(item.amenities),
    images:       item.images ?? [],
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

  // 1. Fetch raw items from Apify actor
  // ── Fixture mode (USE_FIXTURE=true in .env.local) ──────────────────────────
  const USE_FIXTURE = process.env.USE_FIXTURE === 'true';
  const FIXTURE_DATA: ApartmentsItem[] = [
    {
      id: 'fixture-1',
      url: 'https://www.apartments.com/fixture-1',
      'location.fullAddress': '123 Bedford Ave, Brooklyn, NY 11211',
      'location.city': 'Brooklyn',
      'location.state': 'NY',
      'location.neighborhood': 'Williamsburg',
      'rent.min': 2800,
      beds: '2 bd',
      baths: '1 ba',
      description: 'Hardwood floors, renovated kitchen.',
      petFriendly: true,
      amenities: ['Hardwood floors', 'Renovated kitchen'],
      images: ['https://picsum.photos/seed/apt1/600/400'],
    },
    {
      id: 'fixture-2',
      url: 'https://www.apartments.com/fixture-2',
      'location.fullAddress': '456 Court St, Brooklyn, NY 11231',
      'location.city': 'Brooklyn',
      'location.state': 'NY',
      'location.neighborhood': 'Cobble Hill',
      'rent.min': 3200,
      beds: '1 bd',
      baths: '1 ba',
      description: 'Doorman building, gym included.',
      petFriendly: false,
      amenities: ['Doorman', 'Gym'],
      images: ['https://picsum.photos/seed/apt2/600/400'],
    },
    {
      id: 'fixture-3',
      url: 'https://www.apartments.com/fixture-3',
      'location.fullAddress': '789 Atlantic Ave, Brooklyn, NY 11238',
      'location.city': 'Brooklyn',
      'location.state': 'NY',
      'location.neighborhood': 'Boerum Hill',
      'rent.min': 2200,
      beds: 'Studio',
      baths: '1 ba',
      description: 'Studio with exposed brick. Laundry in building.',
      petFriendly: undefined,
      amenities: ['Exposed brick', 'Laundry in building'],
      images: ['https://picsum.photos/seed/apt3/600/400'],
    },
  ];

  let raw: ApartmentsItem[] = [];
  if (USE_FIXTURE) {
    raw = FIXTURE_DATA;
    console.log('[Steady Debug] USE_FIXTURE=true — skipping Apify, using fixture data');
  } else {
    try {
      raw = await runApifyActor();
      console.log(`[Steady Debug] Apify: fetched ${raw.length} raw items from Apartments.com actor`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Steady Debug] Apify actor run failed:', msg);
      // Return empty so DecisionClient falls back to Supabase/mocks
      return NextResponse.json({ error: msg, listings: [], synced: 0 }, { status: 200 });
    }
  }

  // 2. Normalize — filter out items missing price, URL, or image
  // (No rental filtering needed — Apartments.com only has rentals)
  console.log('[Steady Debug] Total raw items fetched:', raw.length);
  console.log('[Steady Debug] Sample raw item:', JSON.stringify(raw[0], null, 2));
  const normalized: ApifyListing[] = raw
    .map(normalizeItem)
    .filter((x): x is ApifyListing => x !== null);
  console.log(`[Steady Debug] Apify: normalized ${normalized.length}/${raw.length} items`);
  console.log('[Steady Debug] Items that failed normalization (first 3):',
    raw.slice(0, 3).map(item => ({
      price: item.rent?.min,
      url: item.url,
      image: item.images?.[0],
      id: item.id,
    }))
  );

  // 3. Upsert to Supabase (DB-safe fields only — no id/amenities/images)
  //    neighborhood, pets, description excluded to protect manually curated data
  let synced = 0;
  let dbError: string | null = null;

  if (normalized.length > 0) {
    const dbRows: Omit<DbRow, 'neighborhood' | 'pets' | 'description'>[] = normalized.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _id, amenities: _am, images: _im, neighborhood: _n, pets: _p, description: _d, ...rest }) => rest
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

  return NextResponse.json({ listings: normalized, synced, dbError, _debug_raw_sample: raw[0] ?? null });
}

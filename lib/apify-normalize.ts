/**
 * Normalization logic for Zillow ZIP Code Search Apify scraper data.
 * Used by /api/apify/sync (start run) and /api/apify/collect (fetch + upsert).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZillowUnit = {
  price: string;       // e.g. "$4,154+"
  beds: string;        // e.g. "0", "1", "2", "Studio"
  roomForRent: boolean;
};

export type ZillowBuildingItem = {
  zpid?: string;
  imgSrc?: string;
  detailUrl?: string;
  hdpUrl?: string;
  url?: string;
  statusType?: string;
  address?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipcode?: string;
  addressNeighborhood?: string;
  minBaseRent?: number;
  maxBaseRent?: number;
  units?: ZillowUnit[];
  isBuilding?: boolean;
};

// Fields safe to INSERT into Supabase listings table
export type DbRow = {
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

// ─── Borough detection ────────────────────────────────────────────────────────

const BOROUGH_MAP: Record<string, string> = {
  'new york': 'Manhattan',
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  bronx: 'Bronx',
  'the bronx': 'Bronx',
  'staten island': 'Staten Island',
};

// Queens — Zillow may list neighborhood names as the city for Queens areas
const QUEENS_CITIES = new Set([
  'astoria', 'long island city', 'lic', 'flushing', 'jackson heights',
  'forest hills', 'rego park', 'woodside', 'sunnyside', 'elmhurst',
  'jamaica', 'ridgewood', 'bayside', 'kew gardens', 'queens village',
  'ozone park', 'south ozone park', 'howard beach', 'corona',
  'richmond hill', 'maspeth', 'middle village', 'queens',
  'arverne', 'rockaway park', 'far rockaway', 'floral park', 'douglaston',
  'little neck', 'glen oaks', 'bellerose', 'hollis', 'st. albans',
  'springfield gardens', 'laurelton', 'rosedale', 'cambria heights',
  'fresh meadows', 'hillcrest', 'briarwood', 'jamaica hills', 'woodhaven',
  'glendale', 'college point', 'whitestone', 'beechhurst',
  'malba', 'murray hill', 'auburndale', 'oakland gardens', 'broadway flushing',
]);

const VALID_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);

function detectBorough(city: string, state: string): string {
  if (!city) return 'Unknown';
  const c = city.toLowerCase().trim();
  if (BOROUGH_MAP[c]) return BOROUGH_MAP[c];
  if (state === 'NY' && QUEENS_CITIES.has(c)) return 'Queens';
  return city;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBedrooms(beds?: string): number {
  if (!beds) return 0;
  const b = beds.toLowerCase().trim();
  if (b.includes('studio')) return 0;
  const match = b.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Takes one Zillow building item and returns one DbRow per unit type in
 * item.units[]. Skips the building entirely if imgSrc is missing or not a
 * public https:// URL, or if the city doesn't resolve to a valid NYC borough.
 * Skips individual units where the parsed price is 0.
 */
export function normalizeBuilding(item: ZillowBuildingItem): DbRow[] {
  // Skip buildings without a public photo
  if (!item.imgSrc || !item.imgSrc.startsWith('https://')) return [];

  const address = (item.address ?? item.addressStreet ?? '').trim();
  const city    = item.addressCity  ?? '';
  const state   = item.addressState ?? '';
  const borough = detectBorough(city, state);
  if (!VALID_BOROUGHS.has(borough)) return [];

  const neighborhood = item.addressNeighborhood ?? city;
  // detailUrl is a full URL; hdpUrl is a path that needs the hostname prepended
  const baseUrl = item.detailUrl
    ?? (item.hdpUrl ? `https://www.zillow.com${item.hdpUrl}` : item.url ?? '');

  const units = item.units ?? [];

  return units
    .map((unit, i): DbRow | null => {
      // Parse price: strip "$", ",", "+" → parseInt; fall back to minBaseRent
      const rawPrice  = unit.price.replace(/[$,+]/g, '');
      const parsed    = parseInt(rawPrice, 10);
      const price     = (!isNaN(parsed) && parsed > 0) ? parsed : (item.minBaseRent ?? 0);
      if (price <= 0) return null;

      const bedrooms    = parseBedrooms(unit.beds);
      // Append a unit discriminator so each bed-type row gets a unique original_url
      const original_url = baseUrl ? `${baseUrl}#unit-${unit.beds}-${i}` : '';
      if (!original_url) return null;

      return {
        address,
        neighborhood,
        borough,
        price,
        bedrooms,
        bathrooms:    1,
        description:  '',
        image_url:    item.imgSrc!,
        original_url,
        pets:         'Unknown',
        status:       'Active',
      };
    })
    .filter((row): row is DbRow => row !== null);
}

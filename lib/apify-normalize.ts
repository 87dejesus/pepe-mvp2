/**
 * Shared normalization logic for Apartments.com Apify scraper data.
 * Used by /api/apify/sync (start run) and /api/apify/collect (fetch + upsert).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApartmentsItem = {
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

// Full listing returned to the React client (includes amenities, images, id)
export type ApifyListing = DbRow & {
  id: string;
  amenities: string[];
  images: string[];
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

// Queens is tricky — Apartments.com lists neighborhood names as the city
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

function parsePets(item: ApartmentsItem): string {
  if (item.petFriendly === true)  return 'Allowed';
  if (item.petFriendly === false) return 'Not allowed';
  if (item.petPolicy) {
    if (/yes|allowed|ok|welcome/i.test(item.petPolicy))  return 'Allowed';
    if (/no|not\s*allowed|none/i.test(item.petPolicy))   return 'Not allowed';
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
  const match = b.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseBathrooms(baths?: string): number {
  if (!baths) return 1;
  const match = baths.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function parseAmenities(list?: Array<{ title: string; value: string[] }>): string[] {
  if (!list) return [];
  return list.flatMap((group) => group.value).map((s) => s.trim()).filter(Boolean);
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

export function normalizeItem(item: ApartmentsItem): ApifyListing | null {
  // Price
  const price = item.rent?.min ?? 0;
  if (price <= 0) return null;

  // Location
  const city  = item.location?.city  ?? '';
  const state = item.location?.state ?? '';
  const borough      = detectBorough(city, state);
  if (!VALID_BOROUGHS.has(borough)) return null;
  const neighborhood = cleanNeighborhood(item, borough);

  // Beds / baths
  const bedrooms  = parseBedrooms(item.beds);
  const bathrooms = parseBathrooms(item.baths);

  // URL (required); image is optional
  const original_url = item.url ?? '';
  if (!original_url) return null;

  // Skip listings where address is missing or contains a price blob instead of a real address
  const address = (item.location?.fullAddress ?? '').trim();
  if (!address || /^\$[\d,]+/.test(address)) {
    console.log(`[Steady Debug] Skipped malformed listing: ${JSON.stringify(item)}`);
    return null;
  }

  const image_url = (() => {
    const candidates = [
      item.images?.[0],
      item.photos?.[0],
      (item as any).imageUrl,
      (item as any).thumbnailUrl,
      (item as any).mainImage,
      (item as any).heroImage,
    ];
    for (const c of candidates) {
      const img = (c ?? '').trim();
      if (img.startsWith('https://') && !img.includes('add7ffb')) return img;
    }
    return '';
  })();
  const id = item.id ?? `apts-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    address,
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

/**
 * Normalization logic for the memo23/streeteasy-ppr Apify actor.
 *
 * Adopted 2026-07-17 after apartments.com hard-blocked the saswave actor
 * (every run since Jul 1 failed at the first page fetch; author inactive since
 * May). Evaluated via /scraper-provider-evaluator: NYC-native source, bundled
 * proxy (the `proxy` input is an optional OVERRIDE, not a requirement),
 * maxItems supported, actively maintained (updated 2026-07-15, 175 users).
 * Live 3-item spike (2026-07-17, $0.016): public photos.zillowstatic.com image
 * URLs (HTTP 200 image/webp, no auth), numeric price, real neighborhood names
 * (areaName), ZIP for borough. Cost $0.003/item + $0.006/start ≈ $0.61 per
 * 200-listing sync (~$6/month at every-3-days).
 *
 * Output shape matches `ApifyListing` from apify-normalize.ts so the collect
 * route's destructure + upsert logic works unchanged.
 *
 * Used by: app/api/apify/collect/route.ts
 */

import type { ApifyListing } from './apify-normalize';

// ─── Input type (observed live 2026-07-17, run VX6fqAaKUAVnZ7XkF) ─────────────

export type StreetEasyPhoto = { description?: string; key?: string; url?: string };

export type StreetEasyItem = {
  id?: number | string;
  street?: string;                    // "335 East 81st Street"
  displayUnit?: string;               // "#2C"
  unit?: string;
  areaName?: string;                  // real neighborhood: "Yorkville", "NoMad"
  zipCode?: string;                   // "10028"
  state?: string;                     // "NY"
  price?: number;                     // numeric, no parsing needed
  netEffectivePrice?: number;
  monthsFree?: number;
  bedroomCount?: number;              // 0 = studio
  fullBathroomCount?: number;
  halfBathroomCount?: number;
  livingAreaSize?: number;            // sq ft, 0 when unknown
  availableAt?: string;               // "2026-07-16"
  furnished?: boolean;
  status?: string;                    // "ACTIVE"
  buildingType?: string;              // "RENTAL"
  urlPath?: string;                   // "/building/335-east-81-street-new_york/2c"
  photos_json?: string | StreetEasyPhoto[];
  sourceGroupLabel?: string;
  geoPoint_latitude?: number;
  geoPoint_longitude?: number;
};

const VALID_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);

// Borough from NYC ZIP prefix (rejects non-NYC bleed). Same table as the
// saswave normalizer; StreetEasy is NYC-native so bleed risk is already low.
function boroughFromZip(zip: string | undefined): string | null {
  if (!zip) return null;
  const p = String(zip).trim().slice(0, 3);
  if (p === '100' || p === '101' || p === '102') return 'Manhattan';
  if (p === '103') return 'Staten Island';
  if (p === '104') return 'Bronx';
  if (p === '112') return 'Brooklyn';
  if (p === '110' || p === '111' || p === '113' || p === '114' || p === '116') return 'Queens';
  return null;
}

// photos_json arrives as a JSON string on flattened rows and as an array
// otherwise. Return public https URLs only.
function parsePhotos(item: StreetEasyItem): string[] {
  let photos: StreetEasyPhoto[] = [];
  const raw = item.photos_json;
  if (typeof raw === 'string') {
    try {
      photos = JSON.parse(raw) as StreetEasyPhoto[];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    photos = raw;
  }
  return photos
    .map((p) => (p?.url ?? '').trim())
    .filter((u) => u.startsWith('https://'));
}

// ─── Main normalizer ────────────────────────────────────────────────────────────

export function normalizeStreetEasyItem(item: StreetEasyItem): ApifyListing | null {
  const urlPath = (item.urlPath ?? '').trim();
  if (!urlPath.startsWith('/')) return null;
  const original_url = `https://streeteasy.com${urlPath}`;

  // Rentals only, currently active. The search URL is /for-rent/nyc, but keep
  // the guard so a sales or off-market row can never slip into the catalog.
  if (item.buildingType && item.buildingType !== 'RENTAL') return null;
  if (item.status && item.status !== 'ACTIVE') return null;

  const borough = boroughFromZip(item.zipCode);
  if (!borough || !VALID_BOROUGHS.has(borough)) return null;

  const street = (item.street ?? '').trim();
  if (!street) return null;
  const unit = (item.displayUnit ?? item.unit ?? '').trim();
  const area = (item.areaName ?? '').trim();
  const address = [
    unit ? `${street} ${unit}` : street,
    area || borough,
    `NY ${item.zipCode ?? ''}`.trim(),
  ].join(', ');

  const price = typeof item.price === 'number' && item.price > 0 ? Math.round(item.price) : 0;
  const bedrooms = typeof item.bedroomCount === 'number' ? item.bedroomCount : 0;
  const bathrooms =
    (typeof item.fullBathroomCount === 'number' ? item.fullBathroomCount : 1) +
    (typeof item.halfBathroomCount === 'number' ? item.halfBathroomCount : 0) * 0.5;

  const photos = parsePhotos(item);
  const image_url = photos[0] ?? '';

  const descriptionParts: string[] = [];
  if (item.livingAreaSize && item.livingAreaSize > 0) descriptionParts.push(`${item.livingAreaSize} sq ft`);
  if (item.availableAt) descriptionParts.push(`Available ${item.availableAt}`);
  if (item.monthsFree && item.monthsFree > 0) descriptionParts.push(`${item.monthsFree} month${item.monthsFree > 1 ? 's' : ''} free`);
  if (item.furnished) descriptionParts.push('Furnished');

  return {
    id: `se-${item.id ?? Math.abs(hashCode(original_url))}`,
    address,
    neighborhood: area || borough,     // real StreetEasy neighborhood when present
    borough,
    price,
    bedrooms,
    bathrooms,
    description: descriptionParts.join(' · '),
    image_url,
    original_url,
    pets: 'Unknown',                   // not exposed at search level by this actor
    status: 'Active',
    transit: '',                       // no transit data at search level
    housing_type: 'whole',             // StreetEasy rentals are whole units
    amenities: [],
    images: photos.slice(0, 5),
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

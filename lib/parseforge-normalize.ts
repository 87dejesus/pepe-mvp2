/**
 * Normalization logic for ParseForge `apartments-com-scraper` Apify actor.
 *
 * Adopted 2026-06-07 to replace `epctex/apartments-scraper-api` (which stopped
 * returning the rent field) AND RentHop (Cloudflare proxy too expensive). This
 * single actor returns numeric prices (minPrice/maxPrice + per-bedroom bedRents)
 * AND public apartments.com CDN image URLs in one cheap run.
 *
 * Output shape matches `ApifyListing` from apify-normalize.ts so the collect
 * route's destructure + upsert logic works unchanged.
 *
 * Used by: app/api/apify/collect/route.ts
 */

import type { ApifyListing } from './apify-normalize';

// ─── Input type (observed live 2026-06-07, maxItems=3 spike) ────────────────────

export type ParseForgeItem = {
  listingId?: string;
  name?: string;
  address?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  url?: string;
  price?: string;                                  // building headline, often "Contact for Price"
  bedRents?: Array<{ bedType?: string; price?: string }>;
  bedroomRange?: string;
  bathroomRange?: string;
  sqftRange?: string;
  amenities?: string[];
  phone?: string;
  imageUrl?: string;                               // public images1.apartments.com CDN URL
  imageCount?: number;
  hasVirtualTour?: boolean;
  hasSpecials?: boolean;
  managementCompany?: string;
  latitude?: number;
  longitude?: number;
  minPrice?: number;                               // numeric — the real price signal
  maxPrice?: number;
};

const VALID_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);

// ─── Borough from NYC ZIP prefix ────────────────────────────────────────────────
// ParseForge's `city` field is unreliable (e.g. "20, 30 Halletts Pt, Astoria"),
// so we derive borough from the ZIP prefix. This also rejects non-NYC bleed
// (Yonkers, Mount Vernon, NJ) that apartments.com/new-york-ny/ can surface.
function boroughFromZip(zip: string | undefined): string | null {
  if (!zip) return null;
  const p = zip.trim().slice(0, 3);
  if (p === '100' || p === '101' || p === '102') return 'Manhattan';
  if (p === '103') return 'Staten Island';
  if (p === '104') return 'Bronx';
  if (p === '112') return 'Brooklyn';
  if (p === '110' || p === '111' || p === '113' || p === '114' || p === '116') return 'Queens';
  return null;
}

// Fallback borough detection from free text when ZIP is missing/unknown.
function boroughFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('staten island')) return 'Staten Island';
  if (t.includes('brooklyn')) return 'Brooklyn';
  if (t.includes('bronx')) return 'Bronx';
  if (t.includes('manhattan')) return 'Manhattan';
  if (/\b(queens|astoria|long island city|flushing|jamaica|ridgewood|sunnyside|elmhurst|corona|forest hills|jackson heights|rego park|woodside)\b/.test(t)) {
    return 'Queens';
  }
  return null;
}

// ─── Bedrooms from bedRents ─────────────────────────────────────────────────────
// A building offers a range (Studio - 2 Beds). We store the SMALLEST bedroom
// count available, matching the old epctex behavior (parseBedrooms took the
// first number from "Studio - 2 bd").
function parseBedType(bedType: string | undefined): number | null {
  if (!bedType) return null;
  const b = bedType.toLowerCase();
  if (b.includes('studio')) return 0;
  const m = b.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function minBedrooms(item: ParseForgeItem): number {
  const fromRents = (item.bedRents ?? [])
    .map((r) => parseBedType(r.bedType))
    .filter((n): n is number => n !== null);
  if (fromRents.length > 0) return Math.min(...fromRents);

  // Fallback: bedroomRange like "Studio - 2 bd" or "1-2"
  if (item.bedroomRange) {
    if (item.bedroomRange.toLowerCase().includes('studio')) return 0;
    const m = item.bedroomRange.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

function parseBathrooms(item: ParseForgeItem): number {
  const src = item.bathroomRange ?? '';
  const m = src.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (!isNaN(n) && n > 0) return n;
  }
  return 1; // apartments.com listings without explicit bath count are almost always 1ba
}

// ParseForge surfaces pet policy inside the amenities array ("Pets Allowed").
function parsePets(item: ParseForgeItem): string {
  const am = (item.amenities ?? []).map((a) => a.toLowerCase());
  if (am.some((a) => a.includes('no pets'))) return 'Not allowed';
  if (am.some((a) => a.includes('pet'))) return 'Allowed';
  return 'Unknown';
}

function pickImageUrl(item: ParseForgeItem): string {
  const img = (item.imageUrl ?? '').trim();
  if (img.startsWith('https://') && !img.includes('add7ffb')) return img;
  return '';
}

// ─── Main normalizer ────────────────────────────────────────────────────────────

export function normalizeParseForgeItem(item: ParseForgeItem): ApifyListing | null {
  // URL is required (it's the upsert conflict key and the user-facing link)
  const original_url = (item.url ?? '').trim();
  if (!original_url) return null;

  // Address required and must not be a price blob
  const address = (item.address ?? item.streetAddress ?? '').trim();
  if (!address || /^\$[\d,]/.test(address)) return null;

  // Borough: ZIP first (rejects non-NYC bleed), then free-text fallback
  const borough =
    boroughFromZip(item.zip) ??
    boroughFromText(`${item.address ?? ''} ${item.city ?? ''}`);
  if (!borough || !VALID_BOROUGHS.has(borough)) return null;

  // Price: minPrice is the real numeric signal. 0 is allowed (Contact for pricing),
  // handled downstream by the card + match score.
  const price =
    typeof item.minPrice === 'number' && item.minPrice > 0 ? item.minPrice : 0;

  const bedrooms = minBedrooms(item);
  const bathrooms = parseBathrooms(item);
  const image_url = pickImageUrl(item);

  // Neighborhood: ParseForge has no clean neighborhood field. Leave it as the
  // borough; the collect route already patches null/borough fallbacks. (This
  // field is not upserted by collect anyway — kept for type completeness.)
  const neighborhood = borough;

  return {
    id: item.listingId ?? `pf-${original_url.split('/').filter(Boolean).pop() ?? Math.abs(hashCode(original_url))}`,
    address,
    neighborhood,
    borough,
    price,
    bedrooms,
    bathrooms,
    description: item.name ?? '',
    image_url,
    original_url,
    pets: parsePets(item),
    status: 'Active',
    amenities: item.amenities ?? [],
    images: image_url ? [image_url] : [],
  };
}

// Deterministic fallback id when listingId is absent (avoids Math.random in
// build-traceable code paths).
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

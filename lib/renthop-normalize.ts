/**
 * Normalization logic for RentHop listing data.
 *
 * Used by: app/api/renthop/sync/route.ts (not yet created)
 *
 * Ported from: scripts/renthop-min-pipeline.mjs
 * All logic here was proven against live RentHop pages before this file was created.
 *
 * Entry point: normalizeRentHopListing(html, stub)
 */

import type { DbRow } from './apify-normalize';

// ─── Input types ──────────────────────────────────────────────────────────────

/**
 * Data extracted from a single RentHop search card (the HTML fragment returned
 * by the /r/listings/search_map_query API). Parsed before fetching the detail page.
 */
export type RentHopSearchStub = {
  listingUrl:      string;
  imageUrl:        string | null;  // 640x640 thumbnail from search card CDN
  addressTitle:    string | null;  // address text from search card link
  price:           string | null;  // "$2,880" string from search card
  beds:            string | null;  // "1BR", "2BR", "Studio" from search card
  neighborhoodRaw: string | null;  // full neigh string, e.g. "Williamsburg, Northern Brooklyn, Brooklyn"
};

// ─── Output types ─────────────────────────────────────────────────────────────

/**
 * Extends DbRow with source tag and species-level pet detail.
 * source is written to Supabase once the source column exists (Phase 2).
 * petDetail is available for future Heed's Take logic but not yet persisted.
 */
export type RentHopRow = DbRow & {
  source: 'renthop';
  petDetail: {
    catsAllowed:        boolean;
    dogsAllowed:        boolean;
    noPets:             boolean;
    hasPetFriendlyText: boolean;
  };
};

export type RentHopValidation = {
  valid:  boolean;
  issues: string[];
};

// ─── Borough / neighborhood helpers ───────────────────────────────────────────

/**
 * Extracts the borough from a RentHop neighborhood string by returning the
 * last non-zip-code segment.
 *
 * "Williamsburg, Northern Brooklyn, Brooklyn"       → "Brooklyn"
 * "Sutton Place, Midtown East, Midtown Manhattan, Manhattan" → "Manhattan"
 * "Williamsburg, Northern Brooklyn, Brooklyn, 11249" → "Brooklyn"
 */
export function parseBoroughFromNeighString(str: string | null): string | null {
  if (!str) return null;
  const parts = str.split(',').map(s => s.trim()).filter(s => !/^\d{5}$/.test(s));
  return parts[parts.length - 1] ?? null;
}

/**
 * Extracts the neighborhood name from a RentHop neighborhood string by
 * returning the first segment.
 *
 * "Williamsburg, Northern Brooklyn, Brooklyn" → "Williamsburg"
 */
export function parseNeighborhoodFromNeighString(str: string | null): string | null {
  if (!str) return null;
  return str.split(',')[0].trim() || null;
}

// ─── JSON-LD parser ───────────────────────────────────────────────────────────

type JsonLd = {
  address?: {
    streetAddress?:  string;
    addressLocality?: string;
    postalCode?:      string;
  };
  floorPlan?: Array<{
    price?:         number | string;
    numberOfRooms?: number | string;
  }>;
};

function parseJsonLd(html: string): JsonLd {
  const match = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return {};
  try {
    const parsed: unknown = JSON.parse(match[1]);
    return (Array.isArray(parsed) ? (parsed[0] ?? {}) : parsed) as JsonLd;
  } catch {
    return {};
  }
}

// ─── Field extractors ─────────────────────────────────────────────────────────

function extractAddress(
  jsonLd:     JsonLd,
  listingUrl: string,
): string {
  const streetAddress = jsonLd.address?.streetAddress ?? null;
  const locality      = jsonLd.address?.addressLocality ?? null;
  const postalCode    = jsonLd.address?.postalCode ?? null;

  // Unit comes from the URL slug: /listings/{address-slug}/{unit}/{id}
  const urlParts = listingUrl.replace('https://www.renthop.com/listings/', '').split('/');
  const unitRaw  = urlParts[1] ?? null;
  const unit     = unitRaw ? `Apt ${unitRaw.toUpperCase()}` : null;

  const street = streetAddress ?? urlParts[0]
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return [street, unit, locality ?? 'Brooklyn', 'NY', postalCode]
    .filter(Boolean)
    .join(', ');
}

function extractPrice(html: string, jsonLd: JsonLd): number {
  // 1. JSON-LD floorPlan price (most structured source)
  const ldPrice = jsonLd.floorPlan?.[0]?.price;
  if (ldPrice) {
    const n = parseInt(String(ldPrice).replace(/[^0-9]/g, ''), 10);
    if (n > 0) return n;
  }

  // 2. og:title "for $X" pattern — confirmed present on all tested pages.
  //    Must come before the "$X/mo" pattern because the og:title value is
  //    authoritative (it's the canonical listing price), whereas "$X/mo"
  //    can appear in related-listing widgets at different prices.
  //
  //    Deliberately excluded: any regex matching "rent" + digits, because
  //    RentHop's copyright notice "Copyright (c) 2009 – 2026 RentHop.com"
  //    contains "2009" which is incorrectly matched by such patterns.
  const titleMatch = html.match(/for \$([0-9,]+)/i);
  if (titleMatch) {
    const n = parseInt(titleMatch[1].replace(/,/g, ''), 10);
    if (n > 0) return n;
  }

  // 3. "$X/mo" inline text — secondary fallback
  const moMatch = html.match(/\$([0-9,]{3,7})\/mo/);
  if (moMatch) {
    const n = parseInt(moMatch[1].replace(/,/g, ''), 10);
    if (n > 0) return n;
  }

  return 0;
}

function extractBedrooms(html: string, jsonLd: JsonLd, stubBeds: string | null): number {
  // JSON-LD numberOfRooms is the cleanest source when present
  const ldRooms = jsonLd.floorPlan?.[0]?.numberOfRooms;
  if (ldRooms !== undefined && ldRooms !== null) {
    const n = parseInt(String(ldRooms), 10);
    if (!isNaN(n)) return n;
  }

  // Detail page text
  const htmlMatch = html.match(/([0-9]+)\s*Bedroom/) ?? html.match(/([0-9]+)\s*Bed/);
  if (htmlMatch) return parseInt(htmlMatch[1], 10);

  // Search card stub fallback
  if (stubBeds) {
    if (stubBeds.toLowerCase().includes('studio')) return 0;
    const m = stubBeds.match(/([0-9]+)/);
    if (m) return parseInt(m[1], 10);
  }

  return 0;
}

function extractBathrooms(html: string): number {
  const patterns = [
    /([0-9.]+)\s*Bathroom/,
    /([0-9.]+)\s*Bath\b/,
    /"numberOfBathroomsTotal":\s*"?([0-9.]+)/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const n = parseFloat(m[1]);
      if (!isNaN(n)) return n;
    }
  }
  return 1; // RentHop listings without explicit bathroom count are almost always 1ba
}

function extractImageUrl(html: string, thumbnailFromCard: string | null): string {
  // Prefer 1024x1024 gallery image — highest quality, confirmed public
  const galleryMatch = html.match(/https:\/\/photos\.renthop\.com\/p\/s\/1024x1024\/[^\s"'<>]+/);
  if (galleryMatch) return galleryMatch[0];

  // og:image fallback (380x300 JPEG)
  const ogMatch = html.match(/og:image[^>]+content="(https:\/\/photos\.renthop\.com\/[^"]+)"/);
  if (ogMatch) return ogMatch[1];

  // Search card thumbnail (640x640 WEBP) — last resort
  return thumbnailFromCard ?? '';
}

function extractDescription(html: string): string {
  const m = html.match(/<div[^>]+class="[^"]*description[^"]*"[^>]*>\s*([\s\S]{20,800}?)\s*<\/div>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function extractPets(html: string): RentHopRow['petDetail'] & { normalized: string } {
  const noPets             = /No\s+Pets/i.test(html) || /Pets\s+Not\s+Allowed/i.test(html);
  const catsAllowed        = /Cats?\s+Allowed/i.test(html);
  const dogsAllowed        = /Dogs?\s+Allowed/i.test(html);
  const hasPetFriendlyText = /pet-friendly/i.test(html);

  // noPets takes precedence over any positive signal — a listing can have
  // "pet-friendly" in boilerplate text while explicitly stating "No Pets"
  // in its policy. The explicit policy wins.
  let normalized: string;
  if (noPets) {
    normalized = 'Not allowed';
  } else if (hasPetFriendlyText || catsAllowed || dogsAllowed) {
    normalized = 'Allowed';
  } else {
    normalized = 'Unknown';
  }

  return { noPets, catsAllowed, dogsAllowed, hasPetFriendlyText, normalized };
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

/**
 * Normalizes a RentHop listing into a DbRow-compatible shape.
 *
 * @param html          Static HTML of the listing detail page (~496KB)
 * @param stub          Data extracted from the search card for this listing
 * @returns             Normalized RentHopRow ready for Supabase upsert
 */
export function normalizeRentHopListing(html: string, stub: RentHopSearchStub): RentHopRow {
  const jsonLd = parseJsonLd(html);

  // Borough: JSON-LD addressLocality is most reliable when present.
  // Falls back to the search card neighborhood string, which was already
  // confirmed to contain the target borough before this detail fetch happened.
  const boroughFromLd   = jsonLd.address?.addressLocality ?? null;
  const boroughFromCard = parseBoroughFromNeighString(stub.neighborhoodRaw);
  const borough         = boroughFromLd ?? boroughFromCard ?? 'Unknown';

  // Neighborhood: detail-page regex lookup first, then search card first segment.
  // The regex covers the 30 most common Brooklyn neighborhood names confirmed
  // present in RentHop page text.
  const neighFromHtml = html.match(
    /Williamsburg|Park Slope|DUMBO|Bushwick|Bed-Stuy|Crown Heights|Prospect Heights|Carroll Gardens|Red Hook|Greenpoint|Fort Greene|Cobble Hill|Flatbush|Flatlands|Bay Ridge|Bensonhurst|Borough Park|Canarsie|East Flatbush|Brownsville|East New York|Sheepshead Bay|Brighton Beach|Coney Island|Sunset Park|Windsor Terrace|Ditmas Park|Midwood|Marine Park|Dyker Heights/
  )?.[0] ?? null;
  const neighFromCard = parseNeighborhoodFromNeighString(stub.neighborhoodRaw);
  const neighborhood  = neighFromHtml ?? neighFromCard ?? borough;

  const address     = extractAddress(jsonLd, stub.listingUrl);
  const price       = extractPrice(html, jsonLd);
  const bedrooms    = extractBedrooms(html, jsonLd, stub.beds);
  const bathrooms   = extractBathrooms(html);
  const image_url   = extractImageUrl(html, stub.imageUrl);
  const description = extractDescription(html);
  const { normalized: pets, ...petDetail } = extractPets(html);

  return {
    address,
    neighborhood,
    borough,
    price,
    bedrooms,
    bathrooms,
    description,
    image_url,
    original_url: stub.listingUrl,
    pets,
    status:       'Active',
    source:       'renthop',
    petDetail,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);

/**
 * Validates a normalized RentHopRow against the requirements for a safe
 * Supabase upsert. Mirrors the intent of validateDbRow() in the pipeline script.
 */
export function validateRentHopRow(row: RentHopRow): RentHopValidation {
  const issues: string[] = [];

  if (!row.address || /^\$[\d,]/.test(row.address)) {
    issues.push('address missing or malformed');
  }
  if (!VALID_BOROUGHS.has(row.borough)) {
    issues.push(`borough not a valid NYC borough: "${row.borough}"`);
  }
  if (!row.price || row.price <= 0) {
    issues.push('price missing or zero');
  }
  if (!row.original_url) {
    issues.push('original_url missing');
  }
  if (!row.image_url) {
    issues.push('image_url missing');
  }

  return { valid: issues.length === 0, issues };
}

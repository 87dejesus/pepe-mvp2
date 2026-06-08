/**
 * Normalization logic for saswave `advanced-apartments-com-scraper` Apify actor.
 *
 * Adopted 2026-06-08 to replace ParseForge. ParseForge returned great data but
 * relied on the CALLER's Apify proxy, which apartments.com blocks at any volume
 * (worked at 3 items, blocked at 50). saswave BUNDLES its own proxy infra (no
 * proxyConfiguration input), so apartments.com anti-bot is the actor's problem,
 * not ours: a single run pulled 40 listings with no block. It returns numeric
 * rent (pricingAndFloorPlans[].rent_label), public images1.apartments.com image
 * URLs, and full address with ZIP. Cost ~$0.001/result (~$2/month at 200 every
 * 3 days).
 *
 * Output shape matches `ApifyListing` from apify-normalize.ts so the collect
 * route's destructure + upsert logic works unchanged.
 *
 * Used by: app/api/apify/collect/route.ts
 */

import type { ApifyListing } from './apify-normalize';

// ─── Input type (observed live 2026-06-08) ──────────────────────────────────────

export type SaswaveFloorPlan = {
  model_name?: string;
  rent_label?: string;                 // e.g. "$1,950 - $2,300"
  details?: string[];                  // e.g. ["1 Bed", "1 Bath", "650 - 750 Sq Ft", "$1,950 Deposit"]
  units?: unknown[];
};

export type SaswaveTransportGroup = { subtitle?: string; stations?: string[] };

export type SaswaveItem = {
  url?: string;
  pricingAndFloorPlans?: SaswaveFloorPlan[];
  about?: {
    description?: string;
    title?: string;
    location?: string;                 // e.g. "5959 Broadway , Bronx , NY 10463"
    image?: string;                    // public images1.apartments.com CDN URL
    images?: string[];
  };
  contact?: Record<string, unknown>;
  amenities?: unknown;
  transportation?: { description?: string; groups?: SaswaveTransportGroup[] };
};

const VALID_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);

// Borough from NYC ZIP prefix (rejects non-NYC bleed: Yonkers, Mount Vernon, NJ).
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

// "5959 Broadway , Bronx , NY 10463" → tidy "5959 Broadway, Bronx, NY 10463"
function cleanAddress(loc: string): string {
  return loc.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').replace(/\s+/g, ' ').trim();
}

function zipFromLocation(loc: string): string | undefined {
  const m = loc.match(/\b(\d{5})\b/);
  return m ? m[1] : undefined;
}

// Lowest numeric dollar value across all floor-plan rent labels. 0 if none.
function minPrice(plans: SaswaveFloorPlan[]): number {
  const prices: number[] = [];
  for (const p of plans) {
    const label = p.rent_label ?? '';
    for (const m of label.matchAll(/\$\s*([\d,]+)/g)) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(n) && n > 0) prices.push(n);
    }
  }
  return prices.length ? Math.min(...prices) : 0;
}

function bedFromDetails(details: string[]): number | null {
  for (const d of details) {
    const t = d.toLowerCase();
    if (t.includes('studio')) return 0;
    const m = t.match(/(\d+)\s*bed/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function bathFromDetails(details: string[]): number | null {
  for (const d of details) {
    const m = d.toLowerCase().match(/(\d+(?:\.\d+)?)\s*bath/);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

// Smallest bedroom count offered (matches prior epctex/parseforge behavior).
function minBedrooms(plans: SaswaveFloorPlan[]): number {
  const beds = plans
    .map((p) => bedFromDetails(p.details ?? []))
    .filter((n): n is number => n !== null);
  return beds.length ? Math.min(...beds) : 0;
}

function minBathrooms(plans: SaswaveFloorPlan[]): number {
  const baths = plans
    .map((p) => bathFromDetails(p.details ?? []))
    .filter((n): n is number => n !== null);
  return baths.length ? Math.min(...baths) : 1;
}

function parsePets(item: SaswaveItem): string {
  const blob = JSON.stringify(item.amenities ?? '').toLowerCase();
  if (blob.includes('no pets')) return 'Not allowed';
  if (blob.includes('pet')) return 'Allowed';
  return 'Unknown';
}

// Nearest WALKABLE subway from saswave's transportation.groups. Stations look
// like "125 Street (4,5,6 Line) : Walk: 3 min / 0.2 mi" or, without a line,
// "Van Cortlandt Park-242 Street : Walk: 3 min / 0.2 mi". We pick the shortest
// walk and format a tight note for the card. Falls back to nearest drive if no
// station is walkable, and to '' if there is no subway data at all.
function parseTransit(item: SaswaveItem): string {
  const groups = item.transportation?.groups ?? [];
  const subway = groups.find((g) => /subway/i.test(g.subtitle ?? ''));
  const stations = subway?.stations ?? [];

  type Stop = { name: string; lines: string | null; mode: 'walk' | 'drive'; min: number };
  const stops: Stop[] = [];
  for (const s of stations) {
    const m = s.match(/^\s*(.*?)\s*(?:\(([^)]*?)\s*Line\)\s*)?:\s*(Walk|Drive):\s*(\d+)\s*min/i);
    if (!m) continue;
    stops.push({
      name: m[1].trim(),
      lines: m[2] ? m[2].replace(/\s+/g, '') : null,
      mode: /walk/i.test(m[3]) ? 'walk' : 'drive',
      min: parseInt(m[4], 10),
    });
  }
  if (!stops.length) return '';

  const walks = stops.filter((s) => s.mode === 'walk').sort((a, b) => a.min - b.min);
  const best = walks[0] ?? stops.slice().sort((a, b) => a.min - b.min)[0];
  const verb = best.mode === 'walk' ? 'min walk' : 'min drive';

  if (best.lines) return `${best.lines} train · ${best.min} ${verb}`;
  // No line label: use a tidy station name with common abbreviations.
  const name = best.name
    .replace(/\bStreet\b/g, 'St')
    .replace(/\bAvenue\b/g, 'Av')
    .replace(/\bBoulevard\b/g, 'Blvd');
  return `${name} · ${best.min} ${verb}`;
}

function pickImage(about: NonNullable<SaswaveItem['about']>): string {
  const img = (about.image ?? '').trim();
  if (img.startsWith('https://') && !img.includes('add7ffb')) return img;
  const arr = about.images ?? [];
  const first = Array.isArray(arr) ? arr.find((u) => typeof u === 'string' && u.startsWith('https://')) : '';
  return (first as string) ?? '';
}

// ─── Main normalizer ────────────────────────────────────────────────────────────

export function normalizeSaswaveItem(item: SaswaveItem): ApifyListing | null {
  const original_url = (item.url ?? '').trim();
  if (!original_url) return null;

  const about = item.about ?? {};
  const locRaw = (about.location ?? '').trim();
  if (!locRaw) return null;

  const zip = zipFromLocation(locRaw);
  const borough = boroughFromZip(zip) ?? boroughFromText(locRaw);
  if (!borough || !VALID_BOROUGHS.has(borough)) return null;

  const address = cleanAddress(locRaw);
  if (/^\$[\d,]/.test(address)) return null;

  const plans = item.pricingAndFloorPlans ?? [];
  const price = minPrice(plans);            // 0 allowed → "Contact for pricing" downstream
  const bedrooms = minBedrooms(plans);
  const bathrooms = minBathrooms(plans);
  const image_url = pickImage(about);

  return {
    id: `sas-${original_url.split('/').filter(Boolean).pop() ?? Math.abs(hashCode(original_url))}`,
    address,
    neighborhood: borough,              // not upserted by collect; patched to borough anyway
    borough,
    price,
    bedrooms,
    bathrooms,
    description: about.description ?? about.title ?? '',
    image_url,
    original_url,
    pets: parsePets(item),
    status: 'Active',
    transit: parseTransit(item),
    amenities: [],
    images: image_url ? [image_url] : [],
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

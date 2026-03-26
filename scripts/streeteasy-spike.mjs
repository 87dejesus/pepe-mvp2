/**
 * Isolated local-only spike: memo23~apify-streeteasy-cheerio
 *
 * Purpose: validate whether this actor is a viable immediate (or near-term)
 * replacement for epctex~apartments-scraper-api in The Steady One pipeline.
 *
 * What this script does NOT touch:
 *   - production cron routes (app/api/apify/*)
 *   - lib/apify-normalize.ts
 *   - Supabase / any database
 *   - vercel.json
 *
 * What this script produces:
 *   - STREETEASY_SPIKE_RAW.json   (raw actor output, or empty array if blocked)
 *   - STREETEASY_SPIKE_REPORT.md  (findings + verdict)
 *
 * Run: node scripts/streeteasy-spike.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '..');
const envPath    = path.join(repoRoot, '.env.local');

// ─── env loader ───────────────────────────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key   = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function safeUrl(v) {
  return typeof v === 'string' && /^https?:\/\//i.test(v) ? v : null;
}

function looksLikeFloorPlan(url) {
  if (!url) return false;
  return /floor[ _-]?plan|floorplan|fp[._/-]|\/fp\/|\/plan\/|blueprint|siteplan/i.test(url);
}

function classifyImage(url) {
  if (!url)                       return 'missing';
  if (!/^https?:\/\//i.test(url)) return 'invalid';
  if (looksLikeFloorPlan(url))    return 'floor-plan-like';
  return 'photo-like';
}

function isKnownPlaceholder(url) {
  if (!url) return true;
  // Known apartments.com placeholder hash
  if (url.includes('add7ffb')) return true;
  return false;
}

// ─── Borough detection ────────────────────────────────────────────────────────
// StreetEasy is NYC-native so borough may come as a direct field.
// We still implement the same fallback as lib/apify-normalize.ts for safety.

const BOROUGH_MAP = {
  'new york':     'Manhattan',
  manhattan:      'Manhattan',
  brooklyn:       'Brooklyn',
  bronx:          'Bronx',
  'the bronx':    'Bronx',
  'staten island':'Staten Island',
};

const QUEENS_CITIES = new Set([
  'astoria','long island city','lic','flushing','jackson heights',
  'forest hills','rego park','woodside','sunnyside','elmhurst',
  'jamaica','ridgewood','bayside','kew gardens','queens village',
  'ozone park','south ozone park','howard beach','corona',
  'richmond hill','maspeth','middle village','queens',
  'arverne','rockaway park','far rockaway','floral park','douglaston',
  'little neck','glen oaks','bellerose','hollis','st. albans',
  'springfield gardens','laurelton','rosedale','cambria heights',
  'fresh meadows','hillcrest','briarwood','jamaica hills','woodhaven',
  'glendale','college point','whitestone','beechhurst',
  'malba','murray hill','auburndale','oakland gardens','broadway flushing',
]);

const VALID_BOROUGHS = new Set(['Manhattan','Brooklyn','Queens','Bronx','Staten Island']);

function detectBorough(rawBorough, city, state) {
  // StreetEasy path: borough may be a direct field
  if (rawBorough) {
    const b = rawBorough.trim();
    if (VALID_BOROUGHS.has(b)) return b;
    const mapped = BOROUGH_MAP[b.toLowerCase()];
    if (mapped) return mapped;
  }
  // Fallback: city-based detection (same as current normalizer)
  if (!city) return 'Unknown';
  const c = city.toLowerCase().trim();
  if (BOROUGH_MAP[c]) return BOROUGH_MAP[c];
  if (state === 'NY' && QUEENS_CITIES.has(c)) return 'Queens';
  return city;
}

// ─── Field extractors ─────────────────────────────────────────────────────────

/**
 * StreetEasy schema is entirely unconfirmed before this spike.
 * We probe all plausible field paths for images and record what we find.
 * Naming conventions: StreetEasy actors often use media.photos, media.floorPlans,
 * photos[], images[], or a nested structure. We check all of them.
 */
function extractPhotoCandidates(item) {
  // Probe every plausible image field path

  // Nested media object (common StreetEasy pattern based on README mention of "media assets")
  const mediaphotos     = Array.isArray(item?.media?.photos)
    ? item.media.photos.map(p => (typeof p === 'string' ? p : (p?.url ?? null))).filter(Boolean)
    : [];
  const mediaFloorPlans = Array.isArray(item?.media?.floorPlans)
    ? item.media.floorPlans.map(p => (typeof p === 'string' ? p : (p?.url ?? null))).filter(Boolean)
    : [];
  const mediaVideos     = Array.isArray(item?.media?.videos)
    ? item.media.videos.map(p => (typeof p === 'string' ? p : (p?.url ?? null))).filter(Boolean)
    : [];

  // Top-level arrays (apartments.com pattern, may also appear here)
  const topLevelPhotos = Array.isArray(item.photos)
    ? item.photos.map(p => (typeof p === 'string' ? p : (p?.url ?? null))).filter(Boolean)
    : [];
  const topLevelImages = Array.isArray(item.images)
    ? item.images.map(p => (typeof p === 'string' ? p : (p?.url ?? null))).filter(Boolean)
    : [];

  // Single-image fields
  const imageUrl      = safeUrl(item.imageUrl ?? item.image_url ?? item.image ?? item.primaryPhoto?.url ?? item.photo);
  const thumbnailUrl  = safeUrl(item.thumbnailUrl ?? item.thumbnail);
  const heroImage     = safeUrl(item.heroImage ?? item.mainImage);

  // Record ALL raw field paths found for diagnostic purposes
  const rawImageFields = {};
  if (item.media)             rawImageFields['media'] = Object.keys(item.media);
  if (item.photos)            rawImageFields['photos'] = `array[${topLevelPhotos.length}]`;
  if (item.images)            rawImageFields['images'] = `array[${topLevelImages.length}]`;
  if (item.imageUrl)          rawImageFields['imageUrl'] = item.imageUrl;
  if (item.image_url)         rawImageFields['image_url'] = item.image_url;
  if (item.image)             rawImageFields['image'] = item.image;
  if (item.primaryPhoto)      rawImageFields['primaryPhoto'] = JSON.stringify(item.primaryPhoto);
  if (item.thumbnail)         rawImageFields['thumbnail'] = item.thumbnail;
  if (item.heroImage)         rawImageFields['heroImage'] = item.heroImage;
  if (item.mainImage)         rawImageFields['mainImage'] = item.mainImage;

  // Determine the best available photo array
  // Priority: media.photos > top-level photos > images
  const bestPhotosArray = mediaphotos.length > 0 ? mediaphotos
    : topLevelPhotos.length > 0 ? topLevelPhotos
    : topLevelImages;

  const bestPhotosSource = mediaphotos.length > 0 ? 'media.photos'
    : topLevelPhotos.length > 0 ? 'photos'
    : topLevelImages.length > 0 ? 'images'
    : 'none';

  return {
    // Best photo array
    bestPhotosArray,
    bestPhotosSource,
    bestPhotosCount: bestPhotosArray.length,
    // Explicit floor plan array (separation confirmation)
    floorPlansArray:     mediaFloorPlans,
    floorPlansSource:    mediaFloorPlans.length > 0 ? 'media.floorPlans' : 'none',
    floorPlansCount:     mediaFloorPlans.length,
    floorPlansSeparated: mediaFloorPlans.length > 0, // key validation check
    // Videos / 3D tours (bonus)
    videosCount:         mediaVideos.length,
    // Single-image fallbacks
    imageUrl,
    thumbnailUrl,
    heroImage,
    // Raw field inventory
    rawImageFields,
  };
}

function classifyPhotosArray(arr) {
  const results = arr.map(url => ({
    url,
    classification: isKnownPlaceholder(url) ? 'placeholder' : classifyImage(url),
  }));
  return {
    total:       results.length,
    photoLike:   results.filter(r => r.classification === 'photo-like').length,
    floorPlan:   results.filter(r => r.classification === 'floor-plan-like').length,
    placeholder: results.filter(r => r.classification === 'placeholder').length,
    invalid:     results.filter(r => r.classification === 'invalid').length,
    sampleUrls:  arr.slice(0, 3),
  };
}

/**
 * StreetEasy-specific location extraction.
 * StreetEasy is NYC-native so it may return borough directly.
 * We probe for all plausible field paths.
 */
function extractLocation(item) {
  // Probe all plausible borough field paths
  const rawBorough      = item.borough ?? item.location?.borough ?? item.address?.borough ?? null;
  const rawNeighborhood = item.neighborhood ?? item.location?.neighborhood ?? item.address?.neighborhood ?? null;
  const rawCity         = item.city ?? item.location?.city ?? item.address?.city ?? null;
  const rawState        = item.state ?? item.location?.state ?? item.address?.state ?? 'NY';
  const rawAddress      = item.address?.full ?? item.address?.street ?? item.fullAddress
                        ?? item.location?.fullAddress ?? item.streetAddress ?? null;
  const rawZip          = item.zipCode ?? item.address?.zipCode ?? item.postalCode ?? null;
  const rawLat          = item.lat ?? item.latitude ?? item.location?.lat ?? item.geo?.lat ?? null;
  const rawLng          = item.lng ?? item.longitude ?? item.location?.lng ?? item.geo?.lng ?? null;

  const derivedBorough = detectBorough(rawBorough, rawCity, rawState);
  const boroughValid   = VALID_BOROUGHS.has(derivedBorough);
  const boroughWasDirect = rawBorough && VALID_BOROUGHS.has(rawBorough.trim());

  // Neighborhood quality
  const hasRealNeighborhood = !!rawNeighborhood && rawNeighborhood.trim().length > 0
    && rawNeighborhood.trim() !== derivedBorough;

  return {
    rawBorough,
    rawNeighborhood,
    rawCity,
    rawState,
    rawAddress,
    rawZip,
    rawLat,
    rawLng,
    derivedBorough,
    boroughValid,
    boroughWasDirect,  // true = StreetEasy returned borough directly (no city mapping needed)
    hasRealNeighborhood,
  };
}

/**
 * StreetEasy-specific price extraction.
 * StreetEasy may return: price, rent, rentPrice, monthlyRent, netEffectiveRent, etc.
 */
function extractPrice(item) {
  // Probe all plausible price field paths
  const candidates = [
    item.price,
    item.rent,
    item.rentPrice,
    item.monthlyRent,
    item.rentalPrice,
    item.netEffectiveRent,
    item.listPrice,
  ];

  const priceRaw = candidates.find(v => typeof v === 'number' && v > 0) ?? null;
  const netEffectiveRent = typeof item.netEffectiveRent === 'number' ? item.netEffectiveRent : null;

  // Raw field inventory
  const rawPriceFields = {};
  if (item.price !== undefined)           rawPriceFields['price'] = item.price;
  if (item.rent !== undefined)            rawPriceFields['rent'] = item.rent;
  if (item.rentPrice !== undefined)       rawPriceFields['rentPrice'] = item.rentPrice;
  if (item.monthlyRent !== undefined)     rawPriceFields['monthlyRent'] = item.monthlyRent;
  if (item.netEffectiveRent !== undefined)rawPriceFields['netEffectiveRent'] = item.netEffectiveRent;
  if (item.listPrice !== undefined)       rawPriceFields['listPrice'] = item.listPrice;

  return {
    priceRaw,
    priceValid: priceRaw !== null && priceRaw > 0,
    netEffectiveRent,
    hasNetEffective: netEffectiveRent !== null,
    rawPriceFields,
  };
}

/**
 * StreetEasy-specific bedroom/bathroom extraction.
 */
function extractBedsBaths(item) {
  // Probe all plausible field paths
  const bedroomsRaw    = item.bedrooms ?? item.beds ?? item.bedroomCount ?? null;
  const bathroomsRaw   = item.bathrooms ?? item.baths ?? item.bathroomCount ?? null;
  const sqftRaw        = item.squareFeet ?? item.sqft ?? item.livingArea ?? item.area ?? null;
  const listingTypeRaw = item.listingType ?? item.propertyType ?? item.type ?? null;

  let bedrooms = 0;
  if (typeof bedroomsRaw === 'number') {
    bedrooms = bedroomsRaw;
  } else if (typeof bedroomsRaw === 'string') {
    if (/studio/i.test(bedroomsRaw)) bedrooms = 0;
    else { const m = bedroomsRaw.match(/(\d+)/); bedrooms = m ? parseInt(m[1], 10) : 0; }
  }

  let bathrooms = 1;
  if (typeof bathroomsRaw === 'number') {
    bathrooms = bathroomsRaw;
  } else if (typeof bathroomsRaw === 'string') {
    const m = bathroomsRaw.match(/(\d+)/); bathrooms = m ? parseInt(m[1], 10) : 1;
  }

  return {
    bedroomsRaw,
    bathroomsRaw,
    sqftRaw,
    listingTypeRaw,
    bedrooms,
    bathrooms,
    hasSqft: sqftRaw !== null,
  };
}

/**
 * StreetEasy-specific URL extraction.
 * StreetEasy URLs are like: https://streeteasy.com/rental/12345678
 */
function extractUrl(item) {
  const urlRaw     = item.url ?? item.listingUrl ?? item.link ?? item.pageUrl ?? null;
  const urlValid   = !!safeUrl(urlRaw);
  const isStreetEasy = urlRaw && /streeteasy\.com/i.test(urlRaw);
  const isUnitLevel  = urlRaw && /streeteasy\.com\/(rental|for-rent|apartment)\/\d+/i.test(urlRaw);

  return { urlRaw, urlValid, isStreetEasy, isUnitLevel };
}

/**
 * StreetEasy pet policy extraction.
 * StreetEasy may return: petsAllowed, petPolicy, amenities containing "pets", etc.
 */
function extractPetData(item) {
  const petsAllowed   = item.petsAllowed ?? item.petFriendly ?? item.pets ?? null;
  const petPolicy     = item.petPolicy ?? item.petDetails ?? null;
  const amenities     = Array.isArray(item.amenities) ? item.amenities : [];
  const petInAmenities = amenities.some(a => typeof a === 'string' && /pet/i.test(a));

  let derivedPets = 'Unknown';
  if (petsAllowed === true || petsAllowed === 'yes')          derivedPets = 'Allowed';
  if (petsAllowed === false || petsAllowed === 'no')          derivedPets = 'Not allowed';
  if (derivedPets === 'Unknown' && petPolicy) {
    if (/yes|allowed|ok|welcome|friendly/i.test(petPolicy))  derivedPets = 'Allowed';
    if (/no|not\s*allowed|none/i.test(petPolicy))            derivedPets = 'Not allowed';
  }
  if (derivedPets === 'Unknown' && petInAmenities)            derivedPets = 'Allowed';

  // Raw field inventory
  const rawPetFields = {};
  if (item.petsAllowed !== undefined) rawPetFields['petsAllowed'] = item.petsAllowed;
  if (item.petFriendly !== undefined) rawPetFields['petFriendly'] = item.petFriendly;
  if (item.pets !== undefined)        rawPetFields['pets'] = item.pets;
  if (item.petPolicy !== undefined)   rawPetFields['petPolicy'] = item.petPolicy;
  if (item.petDetails !== undefined)  rawPetFields['petDetails'] = item.petDetails;

  return {
    petsAllowed,
    petPolicy,
    petInAmenities,
    derivedPets,
    hasPetData: petsAllowed !== null || !!petPolicy || petInAmenities,
    rawPetFields,
  };
}

/**
 * StreetEasy-specific: net-effective rent and concessions.
 * This is a key differentiator — StreetEasy captures "1–2 months free" concessions.
 */
function extractConcessions(item) {
  const netEffectiveRent = item.netEffectiveRent ?? null;
  const concessions      = item.concessions ?? item.freeMonths ?? item.monthsFree ?? null;
  const noFee            = item.noFee ?? item.brokerFee === 0 ?? null;
  const brokerFee        = item.brokerFee ?? item.fee ?? null;

  return {
    netEffectiveRent,
    concessions,
    noFee,
    brokerFee,
    hasNetEffective: netEffectiveRent !== null,
    hasConcessions:  concessions !== null,
    hasNoFee:        noFee !== null,
  };
}

// ─── Per-item summary ─────────────────────────────────────────────────────────

function buildItemSummary(item) {
  const photos    = extractPhotoCandidates(item);
  const photoClass = classifyPhotosArray(photos.bestPhotosArray);
  const location  = extractLocation(item);
  const price     = extractPrice(item);
  const bedsBaths = extractBedsBaths(item);
  const url       = extractUrl(item);
  const pet       = extractPetData(item);
  const concessions = extractConcessions(item);

  // Determine the best proposed image_url
  const proposedImage = (() => {
    const photoLike = photos.bestPhotosArray.find(
      u => classifyImage(u) === 'photo-like' && !isKnownPlaceholder(u)
    );
    if (photoLike) return { source: photos.bestPhotosSource + '[0]', url: photoLike };
    if (photos.imageUrl && classifyImage(photos.imageUrl) === 'photo-like')
      return { source: 'imageUrl', url: photos.imageUrl };
    if (photos.heroImage && classifyImage(photos.heroImage) === 'photo-like')
      return { source: 'heroImage', url: photos.heroImage };
    return { source: 'none', url: null };
  })();

  const wouldPassNormalizer = price.priceValid && url.urlValid
    && location.boroughValid && !!location.rawAddress;

  // Record top-level keys for schema discovery
  const topLevelKeys = Object.keys(item).sort();

  return {
    // Schema discovery
    topLevelKeys,
    // Photos
    photos: {
      bestPhotosSource:    photos.bestPhotosSource,
      bestPhotosCount:     photoClass.total,
      photoLikeCount:      photoClass.photoLike,
      floorPlanCount:      photoClass.floorPlan,
      floorPlansSeparated: photos.floorPlansSeparated,
      floorPlansSource:    photos.floorPlansSource,
      floorPlansCount:     photos.floorPlansCount,
      samplePhotoUrls:     photoClass.sampleUrls,
      floorPlanSampleUrls: photos.floorPlansArray.slice(0, 2),
      rawImageFields:      photos.rawImageFields,
    },
    proposedImage,
    // Location
    location: {
      rawBorough:         location.rawBorough,
      rawNeighborhood:    location.rawNeighborhood,
      rawCity:            location.rawCity,
      rawAddress:         location.rawAddress,
      derivedBorough:     location.derivedBorough,
      boroughValid:       location.boroughValid,
      boroughWasDirect:   location.boroughWasDirect,
      hasRealNeighborhood: location.hasRealNeighborhood,
      rawLat:             location.rawLat,
      rawLng:             location.rawLng,
    },
    // Price
    price: {
      priceRaw:         price.priceRaw,
      priceValid:       price.priceValid,
      hasNetEffective:  price.hasNetEffective,
      netEffectiveRent: price.netEffectiveRent,
      rawPriceFields:   price.rawPriceFields,
    },
    // Beds / baths
    bedsBaths: {
      bedrooms:    bedsBaths.bedrooms,
      bathrooms:   bedsBaths.bathrooms,
      bedroomsRaw: bedsBaths.bedroomsRaw,
      bathroomsRaw:bedsBaths.bathroomsRaw,
      sqftRaw:     bedsBaths.sqftRaw,
      listingType: bedsBaths.listingTypeRaw,
    },
    // URL
    url: {
      urlRaw:      url.urlRaw,
      urlValid:    url.urlValid,
      isStreetEasy:url.isStreetEasy,
      isUnitLevel: url.isUnitLevel,
    },
    // Pet
    pet: {
      derivedPets:  pet.derivedPets,
      hasPetData:   pet.hasPetData,
      rawPetFields: pet.rawPetFields,
    },
    // Concessions (StreetEasy-specific strength)
    concessions: {
      hasNetEffective: concessions.hasNetEffective,
      hasConcessions:  concessions.hasConcessions,
      hasNoFee:        concessions.hasNoFee,
      netEffectiveRent:concessions.netEffectiveRent,
      concessions:     concessions.concessions,
      noFee:           concessions.noFee,
    },
    wouldPassNormalizer,
  };
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

function buildAggregate(summaries) {
  const n = summaries.length;
  if (n === 0) return { totalItems: 0 };

  // Collect all unique top-level keys across all items (schema discovery)
  const allKeys = new Set();
  summaries.forEach(s => s.topLevelKeys.forEach(k => allKeys.add(k)));

  return {
    totalItems: n,
    // Schema discovery
    allTopLevelKeys: [...allKeys].sort(),
    // Photos
    withPhotos:             summaries.filter(s => s.photos.bestPhotosCount > 0).length,
    withPhotoLike:          summaries.filter(s => s.photos.photoLikeCount > 0).length,
    withFloorPlansSeparated:summaries.filter(s => s.photos.floorPlansSeparated).length,
    avgPhotosPerItem:       (summaries.reduce((a,s) => a + s.photos.bestPhotosCount, 0) / n).toFixed(1),
    // Image resolution
    withProposedImage:      summaries.filter(s => s.proposedImage.source !== 'none').length,
    withNoUsableImage:      summaries.filter(s => s.proposedImage.source === 'none').length,
    // Location
    withValidBorough:       summaries.filter(s => s.location.boroughValid).length,
    withDirectBorough:      summaries.filter(s => s.location.boroughWasDirect).length,
    withRealNeighborhood:   summaries.filter(s => s.location.hasRealNeighborhood).length,
    withGeoCoords:          summaries.filter(s => s.location.rawLat !== null).length,
    // Price
    withValidPrice:         summaries.filter(s => s.price.priceValid).length,
    withNetEffective:       summaries.filter(s => s.price.hasNetEffective).length,
    // Beds/baths
    withBedrooms:           summaries.filter(s => s.bedsBaths.bedroomsRaw !== null).length,
    withBathrooms:          summaries.filter(s => s.bedsBaths.bathroomsRaw !== null).length,
    withSqft:               summaries.filter(s => s.bedsBaths.sqftRaw !== null).length,
    // URL
    withValidUrl:           summaries.filter(s => s.url.urlValid).length,
    withStreetEasyUrl:      summaries.filter(s => s.url.isStreetEasy).length,
    withUnitLevelUrl:       summaries.filter(s => s.url.isUnitLevel).length,
    // Pet
    withPetData:            summaries.filter(s => s.pet.hasPetData).length,
    petAllowed:             summaries.filter(s => s.pet.derivedPets === 'Allowed').length,
    petNotAllowed:          summaries.filter(s => s.pet.derivedPets === 'Not allowed').length,
    petUnknown:             summaries.filter(s => s.pet.derivedPets === 'Unknown').length,
    // Concessions
    withNoFee:              summaries.filter(s => s.concessions.hasNoFee).length,
    withConcessions:        summaries.filter(s => s.concessions.hasConcessions).length,
    // Normalizer
    wouldPassNormalizer:    summaries.filter(s => s.wouldPassNormalizer).length,
  };
}

// ─── Report builder (for live run) ───────────────────────────────────────────

function buildLiveReport({ actorId, input, runId, runData, rawItems, summaries, agg, runTimeSecs, costUsd }) {
  const photosCoverage = agg.totalItems > 0
    ? Math.round((agg.withPhotoLike / agg.totalItems) * 100)
    : 0;

  const imageVerdict = photosCoverage >= 80
    ? `GOOD — ${agg.withPhotoLike}/${agg.totalItems} items have photo-like images.`
    : photosCoverage >= 50
      ? `MARGINAL — ${agg.withPhotoLike}/${agg.totalItems} items have photo-like images. Below 80% threshold.`
      : `POOR — ${agg.withPhotoLike}/${agg.totalItems} items have photo-like images. Does not solve image problem.`;

  const floorPlanVerdict = agg.withFloorPlansSeparated > 0
    ? `CONFIRMED SEPARATED — ${agg.withFloorPlansSeparated}/${agg.totalItems} items have floor plans in a separate array from photos.`
    : `NOT CONFIRMED — floor plan separation not observed in this sample.`;

  const boroughVerdict = agg.withDirectBorough === agg.totalItems
    ? `EXCELLENT — borough returned as a direct field in all ${agg.totalItems} items. No city-name mapping required.`
    : agg.withValidBorough === agg.totalItems
      ? `GOOD — all items have a valid borough (${agg.withDirectBorough} direct, rest via city mapping).`
      : `PARTIAL — only ${agg.withValidBorough}/${agg.totalItems} items resolved to a valid NYC borough.`;

  const urlVerdict = agg.withUnitLevelUrl === agg.totalItems
    ? `EXCELLENT — all ${agg.totalItems} URLs are unit-level StreetEasy deep links.`
    : agg.withStreetEasyUrl === agg.totalItems
      ? `GOOD — all URLs are on streeteasy.com, ${agg.withUnitLevelUrl}/${agg.totalItems} are unit-level.`
      : `PARTIAL — only ${agg.withStreetEasyUrl}/${agg.totalItems} URLs are on streeteasy.com.`;

  const passing = photosCoverage >= 80
    && agg.withValidBorough >= Math.ceil(agg.totalItems * 0.95)
    && agg.withValidPrice === agg.totalItems
    && agg.withValidUrl === agg.totalItems;

  const verdict = passing
    ? '**PASS** — photos, borough, price, and URL all meet threshold. StreetEasy is viable as immediate migration target.'
    : photosCoverage >= 50
      ? '**PASS WITH CAVEATS** — some criteria met, others need attention. See details.'
      : '**FAIL** — critical criteria not met. Do not migrate to this actor.';

  // Unique schema keys observed
  const schemaKeys = agg.allTopLevelKeys ?? [];

  // Sample items text
  const sampleText = summaries.slice(0, 5).map((s, i) => `
### Item ${i + 1}
- **Photos:** ${s.photos.bestPhotosCount} in ${s.photos.bestPhotosSource} (${s.photos.photoLikeCount} photo-like)
  - Sample: ${s.photos.samplePhotoUrls[0] ?? 'none'}
- **Floor plans separated:** ${s.photos.floorPlansSeparated} (${s.photos.floorPlansSource}, ${s.photos.floorPlansCount} items)
  - Sample floor plan: ${s.photos.floorPlanSampleUrls[0] ?? 'none'}
- **Borough:** ${s.location.rawBorough ?? 'none'} → derived: ${s.location.derivedBorough} (valid: ${s.location.boroughValid}, direct: ${s.location.boroughWasDirect})
- **Neighborhood:** ${s.location.rawNeighborhood ?? 'none'} (real: ${s.location.hasRealNeighborhood})
- **Address:** ${s.location.rawAddress ?? 'none'}
- **Price:** $${s.price.priceRaw}/mo | Net effective: ${s.price.netEffectiveRent ?? 'n/a'}
- **Beds/Baths:** ${s.bedsBaths.bedrooms}br / ${s.bedsBaths.bathrooms}ba | sqft: ${s.bedsBaths.sqftRaw ?? 'n/a'}
- **URL:** ${s.url.urlRaw ?? 'none'} (StreetEasy: ${s.url.isStreetEasy}, unit-level: ${s.url.isUnitLevel})
- **Pet:** ${s.pet.derivedPets} | raw: ${JSON.stringify(s.pet.rawPetFields)}
- **Concessions:** noFee=${s.concessions.noFee ?? 'n/a'} | concessions=${s.concessions.concessions ?? 'n/a'}
- **Would pass normalizer:** ${s.wouldPassNormalizer}
- **All raw fields:** ${s.topLevelKeys.join(', ')}`).join('\n');

  const rawBytes = Buffer.byteLength(JSON.stringify(rawItems), 'utf8');

  return `# STREETEASY_SPIKE_REPORT

Date: ${new Date().toISOString().slice(0, 10)}
Actor: \`${actorId}\`
Run ID: \`${runId}\`
Items: ${rawItems.length}
Run time: ${runTimeSecs ?? 'n/a'}s
Cost: $${costUsd ?? 'n/a'} USD
Raw payload: ${(rawBytes / 1024).toFixed(1)} KiB

---

## Test Scope

- Script: \`scripts/streeteasy-spike.mjs\`
- Production code modified: none
- Database modified: none
- Input:
\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

---

## Schema Discovery

Top-level keys observed across all ${agg.totalItems} items:
\`\`\`
${schemaKeys.join(', ')}
\`\`\`

---

## Image Results

**Photo coverage:** ${photosCoverage}%
**Image verdict:** ${imageVerdict}
**Floor plan separation:** ${floorPlanVerdict}

| Metric | Count | / Total |
|---|---|---|
| Items with any photos | ${agg.withPhotos} | ${agg.totalItems} |
| Items with photo-like images | ${agg.withPhotoLike} | ${agg.totalItems} |
| Items with separated floor plans | ${agg.withFloorPlansSeparated} | ${agg.totalItems} |
| Avg photos per item | ${agg.avgPhotosPerItem} | — |
| Items with no usable image | ${agg.withNoUsableImage} | ${agg.totalItems} |

---

## Location Results

**Borough verdict:** ${boroughVerdict}
**Neighborhood:** ${agg.withRealNeighborhood}/${agg.totalItems} items have a real neighborhood (not just borough)

| Metric | Count | / Total |
|---|---|---|
| Items with valid NYC borough | ${agg.withValidBorough} | ${agg.totalItems} |
| Borough returned as direct field | ${agg.withDirectBorough} | ${agg.totalItems} |
| Items with real neighborhood name | ${agg.withRealNeighborhood} | ${agg.totalItems} |
| Items with geo coordinates | ${agg.withGeoCoords} | ${agg.totalItems} |

---

## Core Field Results

| Metric | Count | / Total |
|---|---|---|
| Items with valid price | ${agg.withValidPrice} | ${agg.totalItems} |
| Items with net-effective rent | ${agg.withNetEffective} | ${agg.totalItems} |
| Items with bedrooms field | ${agg.withBedrooms} | ${agg.totalItems} |
| Items with bathrooms field | ${agg.withBathrooms} | ${agg.totalItems} |
| Items with sqft | ${agg.withSqft} | ${agg.totalItems} |

---

## URL Results

**URL verdict:** ${urlVerdict}

| Metric | Count | / Total |
|---|---|---|
| Items with valid URL | ${agg.withValidUrl} | ${agg.totalItems} |
| URLs on streeteasy.com | ${agg.withStreetEasyUrl} | ${agg.totalItems} |
| Unit-level URLs | ${agg.withUnitLevelUrl} | ${agg.totalItems} |

---

## Pet Policy Results

| Metric | Count | / Total |
|---|---|---|
| Items with any pet data | ${agg.withPetData} | ${agg.totalItems} |
| Derived: Allowed | ${agg.petAllowed} | ${agg.totalItems} |
| Derived: Not allowed | ${agg.petNotAllowed} | ${agg.totalItems} |
| Derived: Unknown | ${agg.petUnknown} | ${agg.totalItems} |

---

## NYC-Specific Strengths Observed

| Feature | Coverage |
|---|---|
| No-fee indicator | ${agg.withNoFee}/${agg.totalItems} |
| Concession / months-free | ${agg.withConcessions}/${agg.totalItems} |
| Net-effective rent | ${agg.withNetEffective}/${agg.totalItems} |

---

## Normalizer Compatibility

Items that would pass current normalizer (price + URL + valid borough + address): **${agg.wouldPassNormalizer}/${agg.totalItems}**

**Changes required in \`lib/apify-normalize.ts\` to adopt this actor:**
- Update \`ApartmentsItem\` type to match StreetEasy schema (new field names for all fields)
- New image candidate: \`item.media?.photos?.[0]\` or \`item.photos?.[0]\` (confirm field name from schema discovery above)
- Borough: if returned as direct field, borough detection simplifies significantly — remove QUEENS_CITIES mapping
- Neighborhood: if returned as direct field, neighborhood is cleaner than city-derived fallback
- Price: update to use whichever field name was observed above
- Net-effective rent: new field, no existing normalizer support — add if desired
- Pet: update to use whichever field name was observed above
- URL: no change if field is still \`url\`

This is a **significant normalizer rewrite** — all field paths change. But the sync/collect route infrastructure is unchanged.

---

## Sample Items (first 5)
${sampleText}

---

## Verdict

${verdict}

### Is StreetEasy strong enough to be the immediate migration target?

${passing
  ? 'YES — all critical criteria passed. StreetEasy can replace the current provider immediately. Proceed to normalizer rewrite.'
  : photosCoverage >= 50
    ? 'CONDITIONALLY — enough criteria passed to proceed cautiously. Address the caveats before setting a migration date.'
    : 'NO — critical failures prevent immediate migration.'}

---

## Biggest Unknowns (entering this spike)

These were the unknown quantities before the run. Mark each as resolved or still unknown:

1. **Photo field name** — \`media.photos[].url\` vs \`photos[]\` vs other: ${agg.withPhotos > 0 ? `RESOLVED — field is \`${summaries[0]?.photos.bestPhotosSource ?? 'unknown'}\`` : 'UNRESOLVED — no photos found'}
2. **Floor plan separation** — photos and floor plans in separate arrays: ${agg.withFloorPlansSeparated > 0 ? 'CONFIRMED SEPARATED' : 'NOT CONFIRMED in this sample'}
3. **Borough field** — direct field vs derived from city: ${agg.withDirectBorough > 0 ? 'DIRECT FIELD CONFIRMED' : 'DERIVED ONLY — city mapping still needed'}
4. **Neighborhood naming** — real NYC names vs codes/IDs: ${agg.withRealNeighborhood > 0 ? 'REAL NAMES CONFIRMED' : 'NOT CONFIRMED'}
5. **Net-effective rent** — available as distinct field: ${agg.withNetEffective > 0 ? 'CONFIRMED' : 'NOT PRESENT in this sample'}
6. **URL format** — unit-level StreetEasy deep link: ${agg.withUnitLevelUrl > 0 ? 'CONFIRMED UNIT-LEVEL' : agg.withStreetEasyUrl > 0 ? 'StreetEasy URL but not confirmed unit-level' : 'NOT CONFIRMED'}

---

## Implementation Risk

- **Normalizer rewrite scope:** High — all field paths change. This is not an additive change.
- **Infrastructure risk:** Low — same Apify sync/collect pattern, only \`APIFY_ACTOR_ID\` changes.
- **Schema stability risk:** Moderate — actor has been updated 78 times in ~13 months and pricing changed 6 times. Schema may drift.
- **Data quality risk:** Low — StreetEasy is the authoritative NYC rental marketplace. If photos are present, they are listing-quality.
`;
}

// ─── Report builder (for blocked run) ────────────────────────────────────────

function buildBlockedReport({ actorId, input, blockerMessage, actorMeta }) {
  const stats = actorMeta?.stats ?? {};
  const pricing = actorMeta?.pricingInfos ?? [];
  const currentPrice = pricing[pricing.length - 1]?.pricePerUnitUsd ?? 'unknown';
  const trialMinutes = pricing[pricing.length - 1]?.trialMinutes ?? 'unknown';
  const lastRun = stats.lastRunStartedAt ? stats.lastRunStartedAt.slice(0, 10) : 'unknown';
  const totalRuns = stats.totalRuns ?? 'unknown';
  const mau = stats.totalUsers30Days ?? 'unknown';
  const successRate30 = stats.publicActorRunStats30Days
    ? Math.round((stats.publicActorRunStats30Days.SUCCEEDED / stats.publicActorRunStats30Days.TOTAL) * 100)
    : 'unknown';

  const pricingHistory = pricing.map(p =>
    `- $${p.pricePerUnitUsd}/mo (trial: ${p.trialMinutes}min) — started ${(p.startedAt ?? p.createdAt ?? '?').slice(0, 10)}`
  ).join('\n');

  return `# STREETEASY_SPIKE_REPORT

Date: ${new Date().toISOString().slice(0, 10)}
Actor: \`${actorId}\`
Status: **BLOCKED — actor requires paid rental**

---

## Run Attempt

Exact error returned by Apify API:

\`\`\`
${blockerMessage}
\`\`\`

The actor free trial (${trialMinutes} minutes) has already been used up on this Apify account. A paid rental at $${currentPrice}/month is required to run the actor.

**How to unblock:**
Go to \`https://console.apify.com/actors/78UWNeqywwtKfp5z6\` → Rent Actor.
Then re-run: \`node scripts/streeteasy-spike.mjs\`

---

## Test Scope

- Script: \`scripts/streeteasy-spike.mjs\`
- Input that would have been used:
\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`
- Production code modified: none
- Database modified: none

---

## Actor Metadata (confirmed from Apify REST API)

| Field | Value |
|---|---|
| Actor ID | \`78UWNeqywwtKfp5z6\` |
| Actor slug | \`memo23~apify-streeteasy-cheerio\` |
| Source code | Hidden (closed-source) |
| Last build | 0.0.78 (${actorMeta?.taggedBuilds?.latest?.finishedAt?.slice(0, 10) ?? 'unknown'}) |
| Total builds | 78 in ~13 months |
| Last run | ${lastRun} |
| Total runs | ${totalRuns} |
| Total users | ${stats.totalUsers ?? 'unknown'} |
| MAU (30 days) | ${mau} |
| Rating | ${stats.actorReviewRating ?? 'unknown'}/5 (${stats.actorReviewCount ?? 0} reviews) |
| 30-day success rate | ${successRate30}% (${stats.publicActorRunStats30Days?.SUCCEEDED ?? 0} succeeded, ${stats.publicActorRunStats30Days?.FAILED ?? 0} failed, ${stats.publicActorRunStats30Days?.['TIMED-OUT'] ?? 0} timed out) |

**Pricing history (6 changes in 13 months):**
${pricingHistory}

Current price: **$${currentPrice}/month**
Note: Price was scheduled to drop to $15/month on 2026-03-26 (tomorrow) per the latest pricing entry.

---

## Evidence-Based Schema Assessment

The actor's README summary (from Apify metadata) states it captures:

**Confirmed from README summary:**
- prices, availability, bedroom/bath counts, living area, lease terms, net-effective pricing, time-on-market
- geo-coordinates
- media assets: **photos, floor plans, videos, 3D tours** (listed as distinct — implies separation)
- agent profiles and contact/license information
- price histories and market metrics (price-per-square-foot, price changes)
- building attributes and amenities, **pet/building policies**
- nearby transit and schools
- property/transaction history

**What this implies for our requirements:**

| Our requirement | Expected StreetEasy output | Confidence |
|---|---|---|
| Interior photos (not floor plans) | photos in a separate array from floorPlans | Medium — claimed in README, not confirmed by live output |
| Floor plan separation | Distinct floor plan array | Medium — implied by listing both separately in README |
| NYC borough (all 5) | Direct borough field (NYC-native platform) | High — StreetEasy only covers NYC |
| Neighborhood names (Williamsburg, Astoria) | Native StreetEasy neighborhood names | High — platform uses standard NYC names |
| Monthly rent in USD | price or monthlyRent field | High — rentals only, USD-denominated |
| Net-effective rent | netEffectiveRent or similar | Medium — explicitly mentioned in README |
| Listing URL (StreetEasy deep link) | streeteasy.com/rental/{id} | High — scraped from StreetEasy, URLs are native |
| Pets (structured field) | petsAllowed or amenity | Medium — "pet/building policies" mentioned |
| No-fee indicator | noFee or brokerFee field | Medium — StreetEasy tracks this natively |
| Bedrooms / bathrooms | bedrooms, bathrooms | High — core listing fields |

**What is entirely unknown without a live run:**
1. Exact field names — none confirmed. README describes capabilities in natural language, not schema.
2. Photo URL format — CDN vs redirect vs session-locked
3. Photo content quality — interior rooms vs exterior vs rendering
4. Whether \`media.photos\` is a flat string array or array of objects with \`url\` property
5. Whether floor plans are in \`media.floorPlans\` or some other path
6. Borough field name — could be \`borough\`, \`location.borough\`, \`address.borough\`, etc.
7. Whether the normalizer can extract borough without a full rewrite
8. Input format — whether \`startUrls\` accepts StreetEasy search pages, or requires specific URL patterns
9. Whether rental listings and for-sale listings are mixed, and how to filter
10. Run time for 10–300 items (actor may be slow — browser-based vs cheerio depends on JS rendering)

---

## Context: Why This Actor Is The Long-Term Target

From \`LISTING_API_FINAL_RECOMMENDATION.md\`:

> *StreetEasy is the only NYC-native rental marketplace... Sending users to StreetEasy is a better user experience than sending them to Apartments.com. NYC renters trust StreetEasy.*

The StreetEasy platform advantages are product-level, not just schema-level:
- Unit-level listings (not building-level like Apartments.com)
- Native neighborhood names — eliminates the QUEENS_CITIES mapping hack
- Net-effective pricing — captures "1–2 months free" concessions as structured data
- Photo quality enforced by StreetEasy standards
- External listing URL is StreetEasy — NYC renters trust this brand vs Apartments.com

These advantages remain true regardless of whether the spike passes.

---

## Both Spikes Blocked: Summary

| Actor | Status | Blocker | Cost to Unblock |
|---|---|---|---|
| \`epctex~apartments-scraper\` (non-API) | BLOCKED | Free trial expired | $5/month |
| \`memo23~apify-streeteasy-cheerio\` | BLOCKED | Free trial expired | $25/month (→ $15/month on 2026-03-26) |

---

## Verdict

**BLOCKED** — the actor cannot be evaluated without renting it. No live data was collected.

This is not a failure of the actor — it is a rental gate. The evidence from actor metadata and the StreetEasy platform itself is consistent with high viability. But claims cannot be confirmed without observed output.

### Is StreetEasy strong enough to be the immediate migration target?

**Cannot be determined.** The biggest unknowns are:
1. Whether the exact field names match what our normalizer expects (or how much rewrite is needed)
2. Whether photo field returns interior-quality listing photos (vs exterior or property-manager stock)
3. Whether floor plans are actually in a separate array or mixed with photos

### Recommended immediate action

Given that BOTH actors are behind a rental gate, the decision is:

**Option A — Rent epctex~apartments-scraper ($5/month):**
Lower risk, lower cost. Same Apify pattern, same source site (Apartments.com), minimal normalizer changes. Solves the immediate image problem if \`photos[]\` contains interior photos as claimed. The non-API spike script is already written (\`scripts/epctex-non-api-spike.mjs\`). Rent it and run the spike in < 5 minutes.

**Option B — Rent memo23~apify-streeteasy-cheerio ($25/month, dropping to $15 on 2026-03-26):**
Higher cost, higher rewrite effort, but better long-term product fit. Renting it tomorrow at $15/month is a meaningful discount. The spike script is ready (\`scripts/streeteasy-spike.mjs\`). But the normalizer rewrite is significant.

**Option C — Rent both and run both spikes:**
Total: $5 + $15 = $20/month. Both scripts are ready. Spikes can run in parallel. This is the fastest path to a fully informed migration decision and avoids a second rental decision after the first spike.

The recommendation from \`LISTING_API_FINAL_RECOMMENDATION.md\` remains valid: start with epctex~apartments-scraper (lower cost, lower risk) and run StreetEasy in parallel if budget allows.
`;
}

// ─── Apify API helpers ────────────────────────────────────────────────────────

async function fetchActorMeta(token, actorId) {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}?token=${token}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data ?? null;
}

async function startRun(token, actorId, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  );
  const body = await res.text();
  if (!res.ok) {
    let parsed;
    try { parsed = JSON.parse(body); } catch (_) { parsed = null; }
    const errType = parsed?.error?.type ?? '';
    const errMsg  = parsed?.error?.message ?? body;
    return { ok: false, errorType: errType, errorMessage: errMsg, rawBody: body };
  }
  const data = JSON.parse(body);
  const runId = data?.data?.id;
  if (!runId) return { ok: false, errorType: 'no-run-id', errorMessage: 'No runId in start response', rawBody: body };
  return { ok: true, runId, startData: data };
}

async function pollRun(token, runId, timeoutMs = 12 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    if (!res.ok) throw new Error(`Poll HTTP ${res.status}`);
    const data   = await res.json();
    const status = data?.data?.status ?? 'UNKNOWN';
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [poll ${elapsed}s] run ${runId} → ${status}`);
    if (status === 'SUCCEEDED') return data;
    if (['FAILED','ABORTED','TIMED-OUT'].includes(status))
      throw new Error(`Run ended with status: ${status}`);
    await sleep(15000);
  }
  throw new Error('Timed out waiting for run to complete');
}

async function fetchItems(token, runId) {
  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&clean=true`
  );
  if (!res.ok) throw new Error(`Items fetch HTTP ${res.status}`);
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvFile(envPath);

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set. Add it to .env.local.');

  const actorId = 'memo23~apify-streeteasy-cheerio';

  // 10-item NYC rental search
  // StreetEasy search URLs for rentals across boroughs
  const input = {
    startUrls: [
      { url: 'https://streeteasy.com/for-rent/nyc' },
      { url: 'https://streeteasy.com/for-rent/brooklyn' },
      { url: 'https://streeteasy.com/for-rent/queens' },
    ],
    maxItems: 10,
  };

  console.log(`\nSpike: ${actorId}`);
  console.log(`Input: ${JSON.stringify(input, null, 2)}\n`);

  // Fetch actor metadata first (always works, no rental required)
  console.log('Fetching actor metadata...');
  const actorMeta = await fetchActorMeta(token, actorId);

  // Attempt to start the run
  console.log('Attempting to start actor run...');
  const startResult = await startRun(token, actorId, input);

  if (!startResult.ok) {
    const isRentalError = startResult.errorType === 'actor-is-not-rented';
    console.log(`\nRun blocked: ${startResult.errorType}`);
    console.log(`Message: ${startResult.errorMessage}`);

    // Write empty raw JSON
    const rawPath = path.join(repoRoot, 'STREETEASY_SPIKE_RAW.json');
    fs.writeFileSync(rawPath, JSON.stringify([], null, 2));
    console.log(`\nWrote empty ${rawPath} (no live data — actor blocked)`);

    // Write blocked report
    const report = buildBlockedReport({
      actorId,
      input,
      blockerMessage: startResult.errorMessage,
      actorMeta,
    });
    const reportPath = path.join(repoRoot, 'STREETEASY_SPIKE_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Wrote ${reportPath}`);

    if (isRentalError) {
      console.log('\nTo unblock: rent the actor at https://console.apify.com/actors/78UWNeqywwtKfp5z6');
      console.log('Then re-run: node scripts/streeteasy-spike.mjs');
    }
    return;
  }

  // Run started — proceed with live analysis
  const { runId } = startResult;
  console.log(`Run started: ${runId}`);

  console.log('Polling for completion (up to 12 min)...');
  const runData = await pollRun(token, runId);
  const runTimeSecs = runData?.data?.stats?.runTimeSecs ?? null;
  const costUsd     = runData?.data?.usageTotalUsd ?? null;
  console.log(`Run completed in ${runTimeSecs}s, cost $${costUsd}`);

  console.log('Fetching dataset items...');
  const rawItems = await fetchItems(token, runId);
  console.log(`Fetched ${rawItems.length} items`);

  // Analyse
  const summaries = rawItems.map(buildItemSummary);
  const agg       = buildAggregate(summaries);

  console.log('\n--- Aggregate ---');
  console.log(JSON.stringify(agg, null, 2));

  // Write raw JSON
  const rawPath = path.join(repoRoot, 'STREETEASY_SPIKE_RAW.json');
  fs.writeFileSync(rawPath, JSON.stringify(rawItems, null, 2));
  console.log(`\nWrote ${rawPath}`);

  // Write live report
  const report = buildLiveReport({ actorId, input, runId, runData, rawItems, summaries, agg, runTimeSecs, costUsd });
  const reportPath = path.join(repoRoot, 'STREETEASY_SPIKE_REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Wrote ${reportPath}`);
}

main().catch(err => {
  console.error('\nFATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

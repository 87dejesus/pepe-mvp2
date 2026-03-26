/**
 * Isolated local-only spike: epctex~apartments-scraper (non-API, browser version)
 *
 * Purpose: validate whether this actor is a viable immediate replacement for
 * epctex~apartments-scraper-api in The Steady One production pipeline.
 *
 * What this script does NOT touch:
 *   - production cron routes (app/api/apify/*)
 *   - lib/apify-normalize.ts
 *   - Supabase / any database
 *   - vercel.json
 *
 * What this script produces:
 *   - EPCTEX_NON_API_SPIKE_RAW.json  (raw actor output for inspection)
 *   - EPCTEX_NON_API_SPIKE_REPORT.md (human-readable findings + verdict)
 *
 * Run: node scripts/epctex-non-api-spike.mjs
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
  if (!url)                         return 'missing';
  if (!/^https?:\/\//i.test(url))   return 'invalid';
  if (looksLikeFloorPlan(url))      return 'floor-plan-like';
  return 'photo-like';
}

function isKnownPlaceholder(url) {
  if (!url) return true;
  if (url.includes('add7ffb')) return true;
  return false;
}

// ─── Borough detection (mirrors lib/apify-normalize.ts exactly) ───────────────

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

function detectBorough(city, state) {
  if (!city) return 'Unknown';
  const c = city.toLowerCase().trim();
  if (BOROUGH_MAP[c]) return BOROUGH_MAP[c];
  if (state === 'NY' && QUEENS_CITIES.has(c)) return 'Queens';
  return city; // returns raw city if not mapped — will fail VALID_BOROUGHS check
}

// ─── Field extractors ─────────────────────────────────────────────────────────

/**
 * Extract all photo candidates from a non-API actor item.
 * The non-API actor returns a top-level `photos` array (confirmed from README).
 * We also probe any other known image fields for completeness.
 */
function extractPhotoCandidates(item) {
  // Primary: photos[] — the field confirmed in the GitHub README
  const photosArray = Array.isArray(item.photos)
    ? item.photos.filter(u => typeof u === 'string')
    : [];

  // Also probe fields the current normalizer uses (to confirm they're absent/present)
  const model0 = item?.models?.[0] ?? {};

  return {
    photosArray,                                   // the key new field
    photosArrayCount:  photosArray.length,
    model0image:       safeUrl(model0.image),      // current API-version field
    model0imageLarge:  safeUrl(model0.imageLarge), // current API-version field
    imagesArray:       Array.isArray(item.images) ? item.images.filter(u => typeof u === 'string') : [],
    imageUrl:          safeUrl(item.imageUrl),
    thumbnailUrl:      safeUrl(item.thumbnailUrl),
  };
}

/**
 * Classify the photos[] array.
 * Returns: count, photoLike, floorPlanLike, placeholder, invalid, sample URLs.
 */
function classifyPhotosArray(photosArray) {
  const results = photosArray.map(url => ({
    url,
    classification: isKnownPlaceholder(url) ? 'placeholder' : classifyImage(url),
  }));
  return {
    total:       results.length,
    photoLike:   results.filter(r => r.classification === 'photo-like').length,
    floorPlan:   results.filter(r => r.classification === 'floor-plan-like').length,
    placeholder: results.filter(r => r.classification === 'placeholder').length,
    invalid:     results.filter(r => r.classification === 'invalid').length,
    sampleUrls:  photosArray.slice(0, 3),
  };
}

/**
 * Extract pet policy data.
 * Non-API actor returns:
 *   - petFriendly: boolean
 *   - petPolicy: string
 *   - fees[]: array of { title, policies: [{ header, values[] }] }
 */
function extractPetData(item) {
  const petFriendly = item.petFriendly;
  const petPolicy   = item.petPolicy ?? null;

  // Parse fees[] for pet policy sections
  const feesPetSections = [];
  if (Array.isArray(item.fees)) {
    for (const fee of item.fees) {
      if (typeof fee.title === 'string' && /pet/i.test(fee.title)) {
        feesPetSections.push({
          title:    fee.title,
          policies: Array.isArray(fee.policies) ? fee.policies.map(p => ({
            header: p.header,
            values: Array.isArray(p.values) ? p.values : [],
          })) : [],
        });
      }
    }
  }

  // Derive normalised pet string using the same logic as lib/apify-normalize.ts
  let derivedPets = 'Unknown';
  if (petFriendly === true)  derivedPets = 'Allowed';
  if (petFriendly === false) derivedPets = 'Not allowed';
  if (derivedPets === 'Unknown' && petPolicy) {
    if (/yes|allowed|ok|welcome/i.test(petPolicy))   derivedPets = 'Allowed';
    if (/no|not\s*allowed|none/i.test(petPolicy))    derivedPets = 'Not allowed';
  }

  return {
    petFriendly,
    petPolicy,
    feesPetSections,
    feesPetSectionsCount: feesPetSections.length,
    derivedPets,
    hasPetData: petFriendly !== undefined || !!petPolicy || feesPetSections.length > 0,
  };
}

/**
 * Extract and validate location fields using existing borough detection.
 */
function extractLocation(item) {
  const city      = item.location?.city      ?? '';
  const state     = item.location?.state     ?? '';
  const neighborhood = item.location?.neighborhood ?? '';
  const fullAddress  = item.location?.fullAddress  ?? '';

  const derivedBorough = detectBorough(city, state);
  const boroughValid   = VALID_BOROUGHS.has(derivedBorough);

  // Mirror cleanNeighborhood from lib/apify-normalize.ts
  let derivedNeighborhood = neighborhood.trim();
  if (!derivedNeighborhood || derivedNeighborhood.length > 60) {
    const raw = city.trim();
    if (raw && !raw.includes('$')) {
      const firstLine = raw.includes('\n') ? raw.split('\n')[0].trim() : raw;
      derivedNeighborhood = firstLine.length <= 60 ? firstLine : derivedBorough;
    } else {
      derivedNeighborhood = derivedBorough;
    }
  }

  return {
    rawCity:            city,
    rawState:           state,
    rawNeighborhood:    neighborhood,
    rawFullAddress:     fullAddress,
    derivedBorough,
    boroughValid,
    derivedNeighborhood,
    neighborhoodIsBorough: derivedNeighborhood === derivedBorough,
  };
}

/**
 * Extract price, bedrooms, bathrooms using same logic as current normalizer.
 */
function extractCore(item) {
  const price = item.rent?.min ?? 0;

  // parseBedrooms
  let bedrooms = 0;
  if (item.beds) {
    const b = item.beds.toLowerCase().trim();
    if (b.includes('studio')) {
      bedrooms = 0;
    } else {
      const m = b.match(/(\d+)/);
      bedrooms = m ? parseInt(m[1], 10) : 0;
    }
  }

  // parseBathrooms
  let bathrooms = 1;
  if (item.baths) {
    const m = item.baths.match(/(\d+)/);
    bathrooms = m ? parseInt(m[1], 10) : 1;
  }

  return {
    price,
    priceValid:  price > 0,
    bedsRaw:     item.beds   ?? null,
    bathsRaw:    item.baths  ?? null,
    sqftRaw:     item.sqft   ?? null,
    bedrooms,
    bathrooms,
    listingUrl:  item.url    ?? null,
    urlValid:    !!item.url,
    description: item.description ?? null,
    hasDescription: !!item.description,
  };
}

// ─── Per-item summary ─────────────────────────────────────────────────────────

function buildItemSummary(item) {
  const photos   = extractPhotoCandidates(item);
  const photoClass = classifyPhotosArray(photos.photosArray);
  const pet      = extractPetData(item);
  const location = extractLocation(item);
  const core     = extractCore(item);

  // Determine what the current normalizer would pick as image_url if we added photos[] support
  const proposedImageUrl = (() => {
    // Proposed new priority: photos[0] (photo-like) > model0.image > model0.imageLarge > ...
    const photoLikeFromPhotos = photos.photosArray.find(
      u => classifyImage(u) === 'photo-like' && !isKnownPlaceholder(u)
    );
    if (photoLikeFromPhotos) return { source: 'photos[0]', url: photoLikeFromPhotos };
    if (photos.model0image && classifyImage(photos.model0image) === 'photo-like')
      return { source: 'models[0].image', url: photos.model0image };
    if (photos.model0imageLarge && classifyImage(photos.model0imageLarge) === 'photo-like')
      return { source: 'models[0].imageLarge', url: photos.model0imageLarge };
    return { source: 'none', url: null };
  })();

  // What the CURRENT normalizer would pick (no photos[] support)
  const currentNormalizerImageUrl = (() => {
    const candidates = [
      photos.model0image,
      photos.model0imageLarge,
      photos.imagesArray[0] ?? null,
      photos.imageUrl,
      photos.thumbnailUrl,
    ];
    const found = candidates.find(u => u && u.startsWith('https://') && !isKnownPlaceholder(u));
    return found ?? null;
  })();

  return {
    id:           item.id ?? null,
    propertyName: item.propertyName ?? null,
    // Photos
    photos: {
      photosArrayCount:  photoClass.total,
      photoLikeCount:    photoClass.photoLike,
      floorPlanCount:    photoClass.floorPlan,
      placeholderCount:  photoClass.placeholder,
      samplePhotoUrls:   photoClass.sampleUrls,
      model0image:       photos.model0image,
      model0imageLarge:  photos.model0imageLarge,
      imagesArrayCount:  photos.imagesArray.length,
    },
    // Image resolution
    proposedImageUrl,
    currentNormalizerImageUrl,
    imageImproved: proposedImageUrl.source === 'photos[0]' && currentNormalizerImageUrl === null,
    // Location
    location: {
      rawCity:            location.rawCity,
      rawNeighborhood:    location.rawNeighborhood,
      rawState:           location.rawState,
      rawFullAddress:     location.rawFullAddress,
      derivedBorough:     location.derivedBorough,
      boroughValid:       location.boroughValid,
      derivedNeighborhood: location.derivedNeighborhood,
      neighborhoodIsBorough: location.neighborhoodIsBorough,
    },
    // Core fields
    core: {
      price:        core.price,
      priceValid:   core.priceValid,
      bedrooms:     core.bedrooms,
      bedsRaw:      core.bedsRaw,
      bathrooms:    core.bathrooms,
      bathsRaw:     core.bathsRaw,
      sqftRaw:      core.sqftRaw,
      listingUrl:   core.listingUrl,
      urlValid:     core.urlValid,
      hasDescription: core.hasDescription,
      descriptionSnippet: core.description ? core.description.slice(0, 120) : null,
    },
    // Pet
    pet: {
      petFriendly:         pet.petFriendly,
      petPolicy:           pet.petPolicy,
      feesPetSectionsCount: pet.feesPetSectionsCount,
      feesPetSections:     pet.feesPetSections,
      derivedPets:         pet.derivedPets,
      hasPetData:          pet.hasPetData,
    },
    // Would pass current normalizer?
    wouldPassNormalizer: core.priceValid && core.urlValid && location.boroughValid && !!location.rawFullAddress,
  };
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

function buildAggregate(summaries) {
  const n = summaries.length;
  return {
    totalItems: n,
    // Photos
    withPhotosArray:          summaries.filter(s => s.photos.photosArrayCount > 0).length,
    withPhotoLikePhotos:      summaries.filter(s => s.photos.photoLikeCount > 0).length,
    withFloorPlanPhotos:      summaries.filter(s => s.photos.floorPlanCount > 0).length,
    withModel0image:          summaries.filter(s => s.photos.model0image !== null).length,
    avgPhotosPerItem:         n > 0 ? (summaries.reduce((a, s) => a + s.photos.photosArrayCount, 0) / n).toFixed(1) : 0,
    // Image resolution
    withProposedImageFromPhotos: summaries.filter(s => s.proposedImageUrl.source === 'photos[0]').length,
    withProposedImageFromModel0: summaries.filter(s => s.proposedImageUrl.source === 'models[0].image').length,
    withNoUsableImage:           summaries.filter(s => s.proposedImageUrl.source === 'none').length,
    withCurrentNormalizerImage:  summaries.filter(s => s.currentNormalizerImageUrl !== null).length,
    // Location
    withValidBorough:          summaries.filter(s => s.location.boroughValid).length,
    withNeighborhoodFallback:  summaries.filter(s => s.location.neighborhoodIsBorough).length,
    // Core
    withValidPrice:            summaries.filter(s => s.core.priceValid).length,
    withValidUrl:              summaries.filter(s => s.core.urlValid).length,
    withDescription:           summaries.filter(s => s.core.hasDescription).length,
    // Pet
    withPetData:               summaries.filter(s => s.pet.hasPetData).length,
    withFeesPetSection:        summaries.filter(s => s.pet.feesPetSectionsCount > 0).length,
    petAllowed:                summaries.filter(s => s.pet.derivedPets === 'Allowed').length,
    petNotAllowed:             summaries.filter(s => s.pet.derivedPets === 'Not allowed').length,
    petUnknown:                summaries.filter(s => s.pet.derivedPets === 'Unknown').length,
    // Normalizer pass rate
    wouldPassNormalizer:       summaries.filter(s => s.wouldPassNormalizer).length,
  };
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport({ actorId, input, runId, runData, rawItems, summaries, agg }) {
  const usage = runData?.data ?? {};
  const cost  = {
    usageTotalUsd: usage.usageTotalUsd ?? null,
    stats: {
      durationMillis: usage.stats?.durationMillis ?? null,
      runTimeSecs:    usage.stats?.runTimeSecs    ?? null,
      computeUnits:   usage.stats?.computeUnits   ?? null,
    },
  };

  const rawBytes = Buffer.byteLength(JSON.stringify(rawItems), 'utf8');
  const avgBytes = rawItems.length > 0 ? Math.round(rawBytes / rawItems.length) : 0;

  // Image verdict
  const photosCoverage = agg.totalItems > 0
    ? Math.round((agg.withPhotoLikePhotos / agg.totalItems) * 100)
    : 0;

  const imageVerdict = photosCoverage >= 80
    ? `GOOD — ${agg.withPhotoLikePhotos}/${agg.totalItems} items have photo-like images in photos[].`
    : photosCoverage >= 50
      ? `MARGINAL — ${agg.withPhotoLikePhotos}/${agg.totalItems} items have photo-like images in photos[]. Below 80% threshold.`
      : `POOR — ${agg.withPhotoLikePhotos}/${agg.totalItems} items have photo-like images in photos[]. Does not solve image problem.`;

  // Improvement over current
  const improvementOverCurrent = agg.withProposedImageFromPhotos > agg.withCurrentNormalizerImage
    ? `YES — photos[] provides ${agg.withProposedImageFromPhotos} usable images vs ${agg.withCurrentNormalizerImage} from models[0].image.`
    : agg.withProposedImageFromPhotos === agg.withCurrentNormalizerImage
      ? `NEUTRAL — photos[] and models[0].image provide the same count (${agg.withCurrentNormalizerImage}). Check content quality.`
      : `NO — photos[] provides fewer images than models[0].image. Unexpected.`;

  // Schema migration assessment
  const schemaMigration = (() => {
    const issues = [];
    if (agg.withValidBorough < agg.totalItems) issues.push(`Borough detection: only ${agg.withValidBorough}/${agg.totalItems} passed — city-name mapping still required`);
    if (agg.withNeighborhoodFallback > 0) issues.push(`Neighborhood: ${agg.withNeighborhoodFallback}/${agg.totalItems} fell back to borough name — neighborhood data thin for these`);
    if (agg.withValidPrice < agg.totalItems) issues.push(`Price: ${agg.withValidPrice}/${agg.totalItems} had a valid rent.min`);
    if (agg.withValidUrl < agg.totalItems) issues.push(`URL: ${agg.withValidUrl}/${agg.totalItems} had a listing URL`);
    if (issues.length === 0) issues.push('No blocking schema issues found');
    return issues;
  })();

  // Overall verdict
  const passing = photosCoverage >= 80 && agg.withValidBorough === agg.totalItems
    && agg.withValidPrice > 0 && agg.withValidUrl === agg.totalItems;

  const verdict = passing
    ? '**PASS** — photos[], borough, price, and URL all meet threshold. Recommend proceeding to normalizer update.'
    : photosCoverage >= 50
      ? '**PASS WITH CAVEATS** — photos[] present but coverage below 80% threshold, or other field issues. See details.'
      : '**FAIL** — photos[] coverage too low or critical fields missing. Do not migrate to this actor.';

  // Sample items text (top 5, compact)
  const sampleText = summaries.slice(0, 5).map((s, i) => `
### Item ${i + 1}: ${s.propertyName ?? s.id ?? 'unknown'}
- Borough: ${s.location.derivedBorough} (valid: ${s.location.boroughValid}) | Neighborhood: ${s.location.derivedNeighborhood}
- Price: $${s.core.price}/mo | Beds: ${s.core.bedrooms} (raw: ${s.core.bedsRaw}) | Baths: ${s.core.bathrooms}
- photos[] count: ${s.photos.photosArrayCount} (photo-like: ${s.photos.photoLikeCount}, floor-plan: ${s.photos.floorPlanCount})
- Sample photo URLs: ${s.photos.samplePhotoUrls.length > 0 ? s.photos.samplePhotoUrls.join(', ') : 'none'}
- models[0].image: ${s.photos.model0image ?? 'none'}
- Proposed image_url source: ${s.proposedImageUrl.source}
- Current normalizer image_url: ${s.currentNormalizerImageUrl ?? 'none'}
- Pet: petFriendly=${s.pet.petFriendly ?? 'n/a'} | petPolicy=${s.pet.petPolicy ?? 'none'} | fees pet sections=${s.pet.feesPetSectionsCount}
${s.pet.feesPetSections.map(fp => `  - ${fp.title}: ${fp.policies.map(p => p.header).join(', ')}`).join('\n')}
- Description: ${s.core.descriptionSnippet ?? 'none'}
- Listing URL: ${s.core.listingUrl ?? 'none'}
- Would pass normalizer: ${s.wouldPassNormalizer}`).join('\n');

  return `# EPCTEX_NON_API_SPIKE_REPORT

Date: ${new Date().toISOString()}

## Overview

Actor tested: \`${actorId}\` (non-API browser version of Apartments.com scraper)
Companion to: \`SCRAPER_VISUALS_SPIKE_REPORT.md\` (tested \`epctex~apartments-scraper-api\`)

This spike validates whether switching from the current API actor to the browser-based actor
solves the image problem identified in the production pipeline without disrupting other fields.

---

## Test Method

- Script: \`scripts/epctex-non-api-spike.mjs\`
- Production routes modified: none
- Database modified: none
- Actor input:
\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

---

## Run Metadata

- Run ID: \`${runId}\`
- Raw items returned: ${rawItems.length}
- Raw payload size: ${rawBytes} bytes (${(rawBytes / 1024).toFixed(1)} KiB)
- Avg bytes per item: ${avgBytes} bytes
- Run time: ${cost.stats.runTimeSecs ?? 'n/a'} seconds
- Estimated cost: $${cost.usageTotalUsd ?? 'n/a'} USD

---

## Aggregate Findings

### Photos (the primary validation target)

| Metric | Count | Of total |
|---|---|---|
| Items with any photos[] | ${agg.withPhotosArray} | ${agg.totalItems} |
| Items with photo-like photos[] | ${agg.withPhotoLikePhotos} | ${agg.totalItems} |
| Items with floor-plan-like photos[] | ${agg.withFloorPlanPhotos} | ${agg.totalItems} |
| Items with models[0].image | ${agg.withModel0image} | ${agg.totalItems} |
| Avg photos per item | ${agg.avgPhotosPerItem} | — |
| **Proposed image from photos[]** | **${agg.withProposedImageFromPhotos}** | **${agg.totalItems}** |
| Proposed image from models[0].image | ${agg.withProposedImageFromModel0} | ${agg.totalItems} |
| No usable image at all | ${agg.withNoUsableImage} | ${agg.totalItems} |
| Current normalizer would find image | ${agg.withCurrentNormalizerImage} | ${agg.totalItems} |

**Image verdict:** ${imageVerdict}

**Improvement over current actor:** ${improvementOverCurrent}

### Location (borough + neighborhood)

| Metric | Count | Of total |
|---|---|---|
| Items with valid NYC borough | ${agg.withValidBorough} | ${agg.totalItems} |
| Items where neighborhood fell back to borough | ${agg.withNeighborhoodFallback} | ${agg.totalItems} |

### Core fields

| Metric | Count | Of total |
|---|---|---|
| Items with valid price (rent.min > 0) | ${agg.withValidPrice} | ${agg.totalItems} |
| Items with valid listing URL | ${agg.withValidUrl} | ${agg.totalItems} |
| Items with description | ${agg.withDescription} | ${agg.totalItems} |
| Items that would pass normalizer | ${agg.wouldPassNormalizer} | ${agg.totalItems} |

### Pet policy

| Metric | Count | Of total |
|---|---|---|
| Items with any pet data | ${agg.withPetData} | ${agg.totalItems} |
| Items with fees[] pet section | ${agg.withFeesPetSection} | ${agg.totalItems} |
| Derived: Allowed | ${agg.petAllowed} | ${agg.totalItems} |
| Derived: Not allowed | ${agg.petNotAllowed} | ${agg.totalItems} |
| Derived: Unknown | ${agg.petUnknown} | ${agg.totalItems} |

---

## Schema Migration Assessment

${schemaMigration.map(s => `- ${s}`).join('\n')}

**Changes needed in \`lib/apify-normalize.ts\` to adopt this actor:**
1. Add \`photos?: string[]\` to the \`ApartmentsItem\` type
2. Add \`fees?: Array<{ title: string; policies: Array<{ header: string; values: any[] }> }>\` to the type
3. In \`normalizeItem()\` image candidate list: prepend \`item.photos?.[0]\` before \`models[0].image\`
4. In \`parsePets()\`: add fallback to parse \`fees[]\` for "Pet Policies" section header keywords
5. No changes needed to borough detection, price, beds, baths, URL, or description parsing

These are all additive changes. No existing field is removed.

---

## Pet Data Assessment for Future Heed's Take Support

${agg.withFeesPetSection > 0
  ? `fees[] pet sections found in ${agg.withFeesPetSection}/${agg.totalItems} items. If the section is present, it provides per-species breakdown (e.g., "Dogs Allowed", "Cats Allowed") with weight limits and fees — sufficient to power species-specific Heed's Take lines like "dogs welcome here (up to 40 lbs)". This is more useful than a binary petFriendly boolean.`
  : `No fees[] pet sections found in this sample. Pet data (if any) came from petFriendly boolean or petPolicy string only. This may be a sample-size artifact. Inspect raw output for presence of fees[] field.`}

---

## Sample Items
${sampleText}

---

## Cost Note

- Actor: \`${actorId}\` — $5/month flat fee (no pay-per-event surcharge for images)
- Current actor: \`epctex~apartments-scraper-api\` — pay-per-event ($0.0002/image fetch with includeVisuals)
- At $5/month flat, this actor is cheaper than the API version at any volume with visuals enabled

---

## Verdict

${verdict}

---

## Next Step If This Passes

1. Update \`lib/apify-normalize.ts\`:
   - Add \`photos?: string[]\` field to \`ApartmentsItem\`
   - Prepend \`item.photos?.[0]\` to the image candidate list in \`normalizeItem()\`
   - Optionally extend \`parsePets()\` to parse \`fees[]\` for richer pet data
2. Set \`APIFY_ACTOR_ID=epctex~apartments-scraper\` in Vercel env vars (or \`.env.local\` for local testing)
3. Run one manual collect cycle and inspect the \`image_url\` column in Supabase
4. If image_url population rate is >= 80%, re-enable the daily cron
5. Do NOT remove \`models[0].image\` fallback from the candidate list — keep it as the secondary path

## Next Step If This Fails

Begin validation spike for \`memo23~apify-streeteasy-cheerio\` per \`LISTING_API_FINAL_RECOMMENDATION.md\`.
`;
}

// ─── Apify API helpers ────────────────────────────────────────────────────────

async function startRun(token, actorId, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  );
  if (!res.ok) throw new Error(`Start run HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const runId = data?.data?.id;
  if (!runId) throw new Error('No runId in start response');
  return { runId, startData: data };
}

async function pollRun(token, runId, timeoutMs = 10 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Poll HTTP ${res.status}`);
    const data   = await res.json();
    const status = data?.data?.status ?? 'UNKNOWN';
    console.log(`  [poll] run ${runId} → ${status}`);
    if (status === 'SUCCEEDED') return data;
    if (['FAILED','ABORTED','TIMED-OUT'].includes(status))
      throw new Error(`Run ended with ${status}`);
    await sleep(12000);
  }
  throw new Error('Timed out waiting for run');
}

async function fetchItems(token, runId) {
  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&clean=true`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Items HTTP ${res.status}`);
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvFile(envPath);

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set. Add it to .env.local.');

  // The non-API browser actor — this is what we are validating
  const actorId = 'epctex~apartments-scraper';

  // 20-item NYC-focused run covering all 5 boroughs
  // proxy is required by this actor's input schema
  const input = {
    startUrls: [
      { url: 'https://www.apartments.com/new-york-ny/' },
      { url: 'https://www.apartments.com/brooklyn-ny/' },
      { url: 'https://www.apartments.com/bronx-ny/' },
      { url: 'https://www.apartments.com/queens-ny/' },
      { url: 'https://www.apartments.com/staten-island-ny/' },
    ],
    maxItems: 20,
    proxy: { useApifyProxy: true },
  };

  console.log(`\nSpike: ${actorId}`);
  console.log(`Input: ${JSON.stringify(input, null, 2)}\n`);

  console.log('Starting actor run...');
  const { runId } = await startRun(token, actorId, input);
  console.log(`Run started: ${runId}`);

  console.log('Polling for completion (up to 10 min)...');
  const runData = await pollRun(token, runId);
  console.log(`Run completed: ${runId}`);

  console.log('Fetching dataset items...');
  const rawItems = await fetchItems(token, runId);
  console.log(`Fetched ${rawItems.length} items`);

  // Analyse
  const summaries = rawItems.map(buildItemSummary);
  const agg       = buildAggregate(summaries);

  console.log('\n--- Aggregate ---');
  console.log(JSON.stringify(agg, null, 2));

  // Write raw JSON
  const rawPath = path.join(repoRoot, 'EPCTEX_NON_API_SPIKE_RAW.json');
  fs.writeFileSync(rawPath, JSON.stringify(rawItems, null, 2));
  console.log(`\nWrote ${rawPath}`);

  // Write report
  const report = buildReport({ actorId, input, runId, runData, rawItems, summaries, agg });
  const reportPath = path.join(repoRoot, 'EPCTEX_NON_API_SPIKE_REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Wrote ${reportPath}`);
}

main().catch(err => {
  console.error('\nFATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

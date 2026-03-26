# SCRAPER_MIGRATION_PLAN

Date: 2026-03-25

## 1. Current files involved

### Apify actor call

- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts)
  - defines `APIFY_ACTOR_ID`
  - builds actor input body
  - calls `POST /v2/acts/{actorId}/runs`
  - stores `run_id` in `sync_runs`

### Sync pipeline

- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts)
  - starts the run
- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts)
  - polls run status
  - fetches dataset items
  - normalizes raw items
  - upserts `listings`
  - marks run `collected`
- [vercel.json](/C:/Users/Luciano/pepe-mvp2/vercel.json)
  - schedules `/api/apify/sync`
  - schedules `/api/apify/collect`

### Normalization

- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts)
  - raw Apartments.com item typing
  - borough detection
  - pets parsing
  - amenities flattening
  - `image_url` derivation
  - `images` carry-through

### Image mapping

- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts)
  - current `image_url` candidate order
- [scripts/test-image.ts](/C:/Users/Luciano/pepe-mvp2/scripts/test-image.ts)
  - one-off raw field inspection script for image fields

### Listing UI consumption of `image_url`

- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx)
  - Supabase query filters to rows with non-empty `image_url`
  - placeholder-image rejection
  - fallback use of `images?.[0]`
- [components/DecisionListingCard.tsx](/C:/Users/Luciano/pepe-mvp2/components/DecisionListingCard.tsx)
  - renders `listing.image_url || listing.images?.[0]`
  - shows "No photo" placeholder when invalid

## 2. Safe non-production spike plan

Goal: determine whether `epctex~apartments-scraper-api` can return real gallery photos when called with `includeVisuals: true`, without touching the production cron path.

### What to change temporarily

Do not edit production routes first.

Create a non-production test path only:

- option A: a one-off script, preferred
  - `scripts/apify-visuals-spike.ts`
- option B: a disabled-by-default API route behind an env flag
  - `app/api/apify/spike/route.ts`

The spike should:

- call the same actor `epctex~apartments-scraper-api`
- use a reduced sample
- use `includeVisuals: true`
- not write to `listings`
- save raw JSON to a local file or print a summarized field report

### How to test `includeVisuals: true`

Use a small NYC sample:

- `maxItems: 10` or `maxItems: 20`
- `startUrls`:
  - one Manhattan listing page
  - one Brooklyn listing page
  - optionally one studio page to preserve current coverage assumptions

Suggested spike input:

```json
{
  "startUrls": [
    "https://www.apartments.com/new-york-ny/",
    "https://www.apartments.com/brooklyn-ny/",
    "https://www.apartments.com/new-york-ny/studio-apartments/"
  ],
  "includeReviews": false,
  "includeVisuals": true,
  "includeInteriorAmenities": true,
  "includeWalkScore": false,
  "maxItems": 10
}
```

### Sample payload fields to inspect

For each sampled raw item, inspect at minimum:

- `id`
- `url`
- `images`
- `models`
- `models[0].image`
- `models[0].imageLarge`
- `imageUrl`
- `thumbnailUrl`
- `mainImage`
- `heroImage`
- any visual/tour-related fields newly returned when `includeVisuals: true`

### How to compare floor plan vs real gallery photos

For each sampled listing:

1. Compare `models[0].image` with `images[0]`, `images[1]`, `images[2]`.
2. Manually classify each URL as one of:
   - real room/interior/exterior gallery photo
   - floor plan
   - placeholder
   - null/missing
3. Record:
   - whether `models[0]` is a floor plan while `images[]` contains real photos
   - whether `images[]` is empty even with `includeVisuals: true`
   - whether image URLs are stable CDN URLs

Acceptance threshold for salvage:

- at least 70% of sampled listings have one usable real gallery photo
- `images[]` returns real photos often enough to drive `primary_image_url`
- floor plans are separable by field or by heuristic

### How to validate cost impact and payload size impact

Run two small samples against the same input:

1. baseline:
   - `includeVisuals: false`
2. visual spike:
   - `includeVisuals: true`

Compare:

- actor run cost in Apify console
- dataset item count
- average raw item JSON size
- total dataset payload size
- run duration

Recommended measurement method:

- save both raw outputs
- compare file size on disk
- compute per-item average size
- capture Apify billed usage from the run page

Report fields:

- run id
- items returned
- bytes total
- bytes per item
- duration
- billed cost

## 3. Likely code changes if we keep the current actor

### Actor input changes

File:

- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts)

Likely changes:

- change `includeVisuals` from `false` to `true`
- optionally make visuals toggleable by env
  - `APIFY_INCLUDE_VISUALS=true`
- optionally reduce `maxItems` if cost increases materially

Likely implementation shape:

```ts
const includeVisuals = process.env.APIFY_INCLUDE_VISUALS === 'true';
```

### Normalization priority changes

File:

- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts)

Current problem:

- `models[0].image` and `models[0].imageLarge` are checked before `item.images[0]`

Likely changes:

- prefer gallery images first
- treat `models` as fallback only
- filter obvious floor plans before choosing primary

Recommended priority:

1. first valid real photo from `item.images[]`
2. first valid non-floor-plan image from any dedicated image field
3. last-resort fallback from `models[0].imageLarge`
4. otherwise empty

### Fallback logic

Files:

- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts)
- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx)
- [components/DecisionListingCard.tsx](/C:/Users/Luciano/pepe-mvp2/components/DecisionListingCard.tsx)

Likely changes:

- preserve full gallery array, not only `image_url`
- make placeholder detection reject known floor-plan URLs if they can be identified
- keep UI fallback to first gallery image if primary is missing
- avoid rejecting a listing when `image_url` is empty but `images[]` contains a valid gallery photo

### Schema implications

Current DB shape appears to rely on:

- `image_url`
- `original_url`
- no persisted gallery array in `listings`

If keeping current actor and improving image quality only:

- minimum schema change: none required
- recommended schema change: add gallery support

Recommended additions:

- `primary_image_url text`
- `gallery_images jsonb`
- keep `image_url` temporarily for backward compatibility

Compatibility path:

- write both `image_url` and `primary_image_url` during transition
- later migrate UI reads to `primary_image_url`

## 4. Likely code changes if we migrate to StreetEasy

### Likely new raw fields

Based on actor docs for `memo23/apify-streeteasy-cheerio`, likely useful fields include:

- `id`
- `areaName`
- `price`
- `bedroomCount`
- `fullBathroomCount`
- `halfBathroomCount`
- `street`
- `unit`
- `state`
- `zipCode`
- `urlPath`
- `status`
- `availableAt`
- `noFee`
- `monthsFree`
- `netEffectivePrice`
- `sourceGroupLabel`
- `media.photos[].url`
- `media.floorPlans`
- `media.videos`
- `media.tour3dUrl`
- `media.assetCount`
- `building.*`
- `amenities.*`
- `policies.petPolicy`
- `geoPoint`

### New normalization mapping

Primary mapping target:

- `address`
  - derive from `street` + `unit`
- `neighborhood`
  - map from `areaName`
- `borough`
  - derive from StreetEasy location/address fields
- `price`
  - `price`
- `bedrooms`
  - `bedroomCount`
- `bathrooms`
  - `fullBathroomCount` plus optional half-bath handling
- `original_url`
  - `https://streeteasy.com${urlPath}`
- `description`
  - source depends on actual actor output
- `pets`
  - derive from `policies.petPolicy`
- `primary_image_url`
  - first valid `media.photos[].url`
- `gallery_images`
  - all valid `media.photos[].url`

### Risks to current pipeline

Files impacted:

- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts)
- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts)
- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts)

Risks:

- current normalizer is Apartments.com-specific
- current `ApartmentsItem` type becomes invalid
- current start URLs strategy becomes invalid
- current image field assumptions become invalid
- dedupe rules may need to change if StreetEasy URLs differ across unit/building contexts
- status semantics may differ

### Compatibility issues with existing listing schema

Potential conflicts:

- `image_url` is singular, but StreetEasy naturally exposes multiple photos
- `description` may be missing or structured differently
- `pets` may be richer than current `Allowed / Not allowed / Unknown`
- address structure may not match current `fullAddress` expectation
- `neighborhood` and `borough` derivation will need revalidation

Recommended migration approach if StreetEasy is chosen:

1. add a new normalizer file
   - `lib/streeteasy-normalize.ts`
2. keep current collector shape, but branch by actor/source
3. dual-write to staging data or a temporary table first
4. compare output quality before cutting over

## 5. Recommended normalized image strategy for The Steady One

### Target fields

Recommended normalized image contract:

- `primary_image_url: string | null`
- `gallery_images: string[]`
- `floor_plan_images: string[]`
- `image_url: string | null`

Purpose:

- `primary_image_url` is the canonical display image
- `gallery_images[]` is the canonical photo set
- `floor_plan_images[]` is optional but useful to avoid contaminating photo ranking
- `image_url` remains as compatibility alias during migration

### Primary image behavior

Rules:

1. choose first valid real gallery photo
2. never choose a floor plan as primary if any real photo exists
3. if only floor plans exist, leave `primary_image_url = null`
4. set `image_url = primary_image_url` during compatibility period

### Gallery behavior

Rules:

1. `gallery_images[]` should contain only real photos
2. dedupe repeated URLs
3. preserve original order when possible
4. exclude obvious placeholders and invalid URLs

### Fallback behavior

UI read order:

1. `primary_image_url`
2. first item in `gallery_images[]`
3. legacy `image_url`
4. no-photo placeholder

### Handling missing or bad images

Reject:

- empty strings
- non-http URLs
- known placeholders
- data URIs
- floor plan URLs when classified as floor plans

If no valid real photo survives:

- keep listing usable
- show no-photo state
- do not fabricate a replacement image

### Avoiding floor plans as primary when real photos exist

Use one of these approaches:

- best: source-level separation if raw source already distinguishes photos vs floor plans
- fallback: heuristic classification on URL/path/text
- last resort: inspect filename/path tokens such as:
  - `floorplan`
  - `floor-plan`
  - `fp_`
  - `plan`

If uncertainty remains:

- rank gallery arrays ahead of `models[0]`
- never use `models[0]` first

## 6. Final recommendation

### Recommendation

Salvage the current actor first. Do not migrate now.

### Why

- current actor is already stable in production
- current production call is not using the actor's visual-enrichment option
- current image failure is at least partly caused by local implementation choices
- salvage path is lower risk, lower effort, and preserves the existing sync pipeline
- StreetEasy is the best replacement, but it is still a real migration with schema and normalization work

### Lowest-risk next step

Build a non-production spike that:

1. runs `epctex~apartments-scraper-api` with `includeVisuals: true`
2. samples 10 to 20 NYC listings
3. compares `models[0].image*` against `images[]`
4. measures cost, payload size, and run duration
5. decides whether `item.images[]` is good enough to become the primary photo source

Decision gate:

- if spike proves `images[]` has real gallery photos at acceptable cost, keep current actor and change normalization
- if spike fails, proceed to a StreetEasy proof-of-concept normalizer

## Implementation note

One stale expectation exists in current UI code:

- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx) still comments as if `/api/apify/sync` returns listings directly, but [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts) only returns run metadata

That should be cleaned up later, but it is not required for the image spike.

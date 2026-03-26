# SCRAPER_OPTIONS_REPORT

Date: 2026-03-25

## Scope

This memo covers the current Apify sync pipeline, the exact image derivation path, whether `epctex~apartments-scraper-api` can be salvaged for real gallery photos, and the best replacement options if it cannot.

## Files inspected

Current production pipeline and image mapping:

- `app/api/apify/sync/route.ts`
- `app/api/apify/collect/route.ts`
- `lib/apify-normalize.ts`
- `app/decision/DecisionClient.tsx`
- `components/DecisionListingCard.tsx`
- `vercel.json`
- `scripts/test-image.ts`

Related but not part of the active Apify production path:

- `scripts/scraper.ts` (older direct scraper logic, not wired into current Apify cron flow)

## Current pipeline summary

### 1. Sync trigger

`app/api/apify/sync/route.ts` starts the actor run and stores the `run_id` in `sync_runs`.

Exact actor call:

- Actor ID default: `epctex~apartments-scraper-api`
- Endpoint: `POST https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}`
- Current input body:

```json
{
  "startUrls": [
    "https://www.apartments.com/new-york-ny/",
    "https://www.apartments.com/brooklyn-ny/",
    "https://www.apartments.com/bronx-ny/",
    "https://www.apartments.com/queens-ny/",
    "https://www.apartments.com/staten-island-ny/",
    "https://www.apartments.com/new-york-ny/studio-apartments/",
    "https://www.apartments.com/brooklyn-ny/studio-apartments/",
    "https://www.apartments.com/bronx-ny/studio-apartments/",
    "https://www.apartments.com/queens-ny/studio-apartments/",
    "https://www.apartments.com/staten-island-ny/studio-apartments/"
  ],
  "includeReviews": false,
  "includeVisuals": false,
  "includeInteriorAmenities": true,
  "includeWalkScore": false,
  "maxItems": 300
}
```

Relevant code:

- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts#L30)
- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts#L36)

### 2. Collection

`app/api/apify/collect/route.ts` does the actual ingestion:

- reads latest `sync_runs.status = 'started'`
- polls `GET /v2/actor-runs/{runId}`
- fetches dataset items from `GET /v2/actor-runs/{runId}/dataset/items?clean=true`
- normalizes each item through `normalizeItem`
- upserts into `listings` on `original_url`
- marks the sync run `collected`

Relevant code:

- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts#L47)
- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts#L63)
- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts#L87)
- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts#L101)
- [app/api/apify/collect/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/collect/route.ts#L125)

### 3. Normalization

`lib/apify-normalize.ts` derives `image_url` from this candidate order:

1. `models[0].image`
2. `models[0].imageLarge`
3. `item.images[0]`
4. `imageUrl`
5. `thumbnailUrl`
6. `mainImage`
7. `heroImage`

It also preserves `images: item.images ?? []`.

Relevant code:

- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts#L165)

### 4. UI usage

The decision flow prefers Supabase rows with non-empty `image_url`:

- `select('*').eq('status', 'Active').neq('image_url', '')`

Then it rejects listings whose image is missing, placeholder-like, or invalid URL.

The card component renders:

- `listing.image_url || listing.images?.[0] || ''`

Relevant code:

- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx#L627)
- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx#L673)
- [components/DecisionListingCard.tsx](/C:/Users/Luciano/pepe-mvp2/components/DecisionListingCard.tsx#L209)

### 5. Scheduling

Production cron:

- `/api/apify/sync` at `0 6 * * *`
- `/api/apify/collect` at `10 6 * * *`

Relevant code:

- [vercel.json](/C:/Users/Luciano/pepe-mvp2/vercel.json#L7)

## Exact current image failure point

This is the real failure chain:

1. The actor is started with `includeVisuals: false`, so the run is explicitly not asking for detail-page images/virtual-tour payloads.
2. The normalizer prioritizes `models[0].image` and `models[0].imageLarge` ahead of `item.images[0]`.
3. You already documented the observed behavior: `models[0].image` is usually a floor plan or null.
4. The UI then depends heavily on `image_url`; Supabase reads only rows with non-empty `image_url`, and later filters reject missing/invalid images.

So the current failure point is not one bug. It is two stacked choices:

- actor input disables visuals
- normalizer chooses `models[0]` before gallery images

Relevant code:

- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts#L49)
- [lib/apify-normalize.ts](/C:/Users/Luciano/pepe-mvp2/lib/apify-normalize.ts#L165)
- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx#L632)
- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx#L675)

## Whether `epctex~apartments-scraper-api` can be salvaged

Yes, likely.

Reason:

- Apify's input schema for this actor explicitly supports `includeVisuals`.
- Apify describes `includeVisuals` as: "Include images and virtual tours for each property. Additional cost applies."
- The actor listing itself says it extracts "images".

Sources:

- Apify actor page: https://apify.com/epctex/apartments-scraper-api/input-schema
- Apify actor page: https://apify.com/epctex/apartments-scraper-api

What that means in practice:

- The current actor is not obviously capped at floor plans only.
- The current production call is simply not requesting the visual-enrichment path.
- Even if visuals are enabled, the normalizer would still need to prefer gallery images over `models[0]`, because `models[0]` is already known to skew toward floor plans.

Conclusion:

- `epctex~apartments-scraper-api` is salvageable enough to justify a controlled spike before any replacement migration.
- A full replacement is not justified yet.

## Research notes from Apify

### Current actor

`epctex/apartments-scraper-api`

- Pricing: pay per event
- Rating: 5.0 (11)
- Total users: 99
- Monthly active users: 36
- Last modified: 4 days ago
- Input supports `includeVisuals`, `includeInteriorAmenities`, `includeWalkScore`

Source:

- https://apify.com/epctex/apartments-scraper-api
- https://apify.com/epctex/apartments-scraper-api/input-schema

### StreetEasy candidate

`memo23/apify-streeteasy-cheerio`

What I found:

- NYC-specific source, which is strategically better than national aggregators for this app
- explicit rental output schema
- explicit media object:
  - `media.photos[].url`
  - `media.floorPlans`
  - `media.videos`
  - `media.tour3dUrl`
  - `media.assetCount`
- rating 5.0 (4)
- total users 105
- monthly active 8
- last modified 4 days ago
- pricing `$25.00/month + usage`

Source:

- https://apify.com/memo23/apify-streeteasy-cheerio

### Zillow candidate

Best Zillow replacement candidate found:

`parseforge/zillow-rentals-scraper`

What I found:

- rental-specific actor
- claims property photos, description, coordinates
- detail-page scraping option for more complete unit data
- recommends residential proxies for best results
- rating 5.0 (1)
- total users 10
- monthly active 5
- last modified 17 days ago
- pricing `$19.00/month + usage`

Source:

- https://apify.com/parseforge/zillow-rentals-scraper

Secondary Zillow candidate:

- `sovereigntaylor/zillow-rentals-scraper`
- promising output (`images`, `floorPlans`, `petPolicy`, `amenities`)
- but weaker marketplace maturity: 0 ratings, 15 total users, 9 days since last update

Source:

- https://apify.com/sovereigntaylor/zillow-rentals-scraper

### Fallback candidate

Best fallback candidate found:

`epctex/trulia-scraper`

What I found:

- extracts descriptions, images, features, pricing, property details, neighborhood, schools
- broader national actor, not NYC-specific
- stronger maturity than the Realtor rental actor I found
- rating 5.0 (7)
- total users 38
- monthly active 3
- last modified 1 day ago
- pricing `$15.00/month + usage`
- requires proxy configuration

Source:

- https://apify.com/epctex/trulia-scraper

Realtor note:

- `silentflow/realtor-rental-scraper` has a strong rental field list including photos and GPS
- but marketplace maturity is weak: 0 ratings, 2 total users, 1 monthly active
- I would not rank it above Trulia yet for production replacement

Source:

- https://apify.com/silentflow/realtor-rental-scraper/api

## Top 3 replacement options

| Rank | Actor | Real gallery photos | NYC coverage | Structure quality | Likely stability | Implementation effort | Estimated cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `memo23/apify-streeteasy-cheerio` | Strong. Explicit `media.photos[].url` plus floor plans separated | Excellent. Native NYC marketplace | High | Medium-high | Medium-high | High |
| 2 | `parseforge/zillow-rentals-scraper` | Good. Explicit property photos | Good, but less NYC-specific and more aggregator noise | Medium | Medium | Medium | Medium-high |
| 3 | `epctex/trulia-scraper` | Good. Explicit images support | Good, but generic national source | Medium | Medium | Medium-high | Medium |

## Recommended option

Recommended overall path: keep the current actor and run a non-production salvage spike first.

Why:

- It is already stable in production.
- The actor appears capable of returning real visuals if called with `includeVisuals: true`.
- The image failure is partly self-inflicted by current input and candidate ordering.
- This is the lowest-risk path and aligns with the requirement not to break the current sync pipeline unless a replacement is clearly better.

Recommended replacement if salvage fails: `memo23/apify-streeteasy-cheerio`.

Why StreetEasy wins among replacements:

- best NYC relevance by far
- explicit separation of photos vs floor plans
- richer rental-specific structure
- likely better downstream match quality for NYC apartment decision support

## Migration risk

### Salvage current actor

Risk: low to medium.

Main risks:

- visual enrichment may increase cost materially
- output shape may change when `includeVisuals` is enabled
- image selection logic still needs to change to avoid floor-plan-first behavior

### Replace with StreetEasy

Risk: medium to high.

Main risks:

- full schema remap required
- current normalization assumptions are Apartments.com-shaped
- source coverage behavior will change materially
- dedupe, status handling, and borough/neighborhood derivation will need retesting
- StreetEasy may need a different crawl strategy than current borough `startUrls`

### Replace with Zillow

Risk: medium to high.

Main risks:

- not NYC-native, so match quality may be noisier
- likely more anti-bot sensitivity / proxy dependence
- unit aggregation may differ from your current listing model

## Exact next implementation step

Do this next, and do not touch the production cron path yet:

1. Add a non-production spike path or one-off script that runs the same `epctex~apartments-scraper-api` actor with `includeVisuals: true` against a small NYC sample.
2. Inspect returned fields for a handful of listings and confirm whether `item.images` contains real gallery photos.
3. If yes, update normalization logic in the spike only so `image_url` prefers `item.images[0]` before any `models[0].image*` field.
4. Compare result quality and incremental cost against the current production run.
5. Only if that fails, start a separate StreetEasy proof-of-concept normalizer.

In plain terms:

- first prove the current actor can return real gallery photos
- then prove those photos map cleanly into the current listing model
- only then consider replacement

## Additional implementation note

There is one stale code comment / expectation worth noting:

- `app/decision/DecisionClient.tsx` comments that `/api/apify/sync` returns normalized listings to the client, but the current route only returns `{ status, runId }`.

That is not the current production image problem, but it is a sign that the live-sync fallback path in the client is not aligned with the actual API behavior.

Relevant code:

- [app/decision/DecisionClient.tsx](/C:/Users/Luciano/pepe-mvp2/app/decision/DecisionClient.tsx#L388)
- [app/api/apify/sync/route.ts](/C:/Users/Luciano/pepe-mvp2/app/api/apify/sync/route.ts#L101)

## Evidence limit

I did not run a live actor sample from this workspace because local `.env.local` does not contain `APIFY_TOKEN`, so I could not verify the last production dataset directly from the terminal.

That does not affect the main conclusion, because Apify's current actor documentation already confirms that the existing actor has a dedicated visual-enrichment option that production is not using.

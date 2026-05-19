# LISTING API FINAL RECOMMENDATION

Date: 2026-03-25
Based on: `LISTING_API_REQUIREMENTS_REPORT.md`, `LISTING_API_SELECTION_CHECKLIST.md`, `LISTING_API_PROVIDER_COMPARISON.md`

---

## Decision Summary

| Decision | Answer |
|---|---|
| Best provider for immediate next implementation | `epctex~apartments-scraper` (non-API browser version) |
| Best long-term provider | `memo23~apify-streeteasy-cheerio` |
| Keep current provider in production now? | Yes, temporarily |
| Replace current provider now? | No — validate first, then replace |
| Did pet-related metadata influence the recommendation? | Marginally, as a tiebreaker only |

---

## 1. Keep the Current Provider in Production? Yes, Temporarily.

The current provider (`epctex~apartments-scraper-api`) has a confirmed image failure that makes it inadequate for the product. But replacing it without a validated alternative would leave the product with zero listings.

Do not touch the production cron until a replacement is validated. The fallback chain (Supabase → Apify live → mock) protects users if Supabase already has listings from previous syncs. The images in the DB are bad, but the product at least shows listings.

Do not disable the current sync while running spikes. Let it keep running daily.

---

## 2. Immediate Next Implementation: `epctex~apartments-scraper` (non-API)

### Why this one first

The core problem is a single confirmed gap: image quality. The current API version has no path to a `photos[]` gallery array — that field belongs to the non-API browser version of the same actor, by the same developer.

Switching from `epctex~apartments-scraper-api` to `epctex~apartments-scraper` is the lowest-risk path to fixing the image problem because:

- **Same Apify infrastructure** — the sync/collect route pattern is identical. Only the `APIFY_ACTOR_ID` env var changes.
- **Same developer (epctex)** — same coding style, same structural conventions. The normalizer needs changes but not a full rewrite.
- **Confirmed gallery field** — `photos[]` array is documented in the GitHub README with real CDN URL examples. This is not a claim from marketing copy; it is schema documentation.
- **Best pet policy structure** — `fees[]` array with per-species breakdown (dogs/cats separately, weight limits, fees) is confirmed from the same README. This is the richest pet policy output of any candidate.
- **5/5 rating, 12 reviews, 972 total users** — the highest trust signal of any candidate by review count and total users.
- **$5/month flat** — cheapest option overall.

### Why not the API version with visuals enabled

The spike (`SCRAPER_VISUALS_SPIKE_REPORT.md`) already answered this. `includeVisuals: true` returned `images[]` = 0/10. The API version simply does not populate a photo gallery the same way the browser version does. Enabling visuals in the API version adds cost and returns `models[0].image` at best — which covers 60% of items with unconfirmed interior photos. That is not a fix.

### Risks to call out

1. **MAU is low (13)** — the user base migrated from this version to the API version when epctex launched it. If epctex deprioritizes the browser version, schema breakage may come without warning. This is the main reason this is the *immediate* pick, not the *long-term* pick.

2. **Slower and heavier** — browser-based scraping is slower than the API version. 300 items/day at browser speed may exceed the 60-second `maxDuration` on the collect route. This needs testing.

3. **Photo content not confirmed** — `photos[]` exists and contains real CDN URLs. Whether those URLs are interior room photos (vs. community area photos, building exteriors mixed in) is not confirmed by a live spike. Floor plan separation is not confirmed.

4. **Borough derivation** — this version uses the same `location.city` / `location.neighborhood` structure as the API version, so the existing borough detection logic is reusable. But this needs to be verified against a live NYC run.

### Exact next validation step

Run a 20-item NYC-only spike against `epctex~apartments-scraper` (non-API) using the same startUrls as production. Confirm:
1. `photos[]` is present and non-empty for at least 80% of items
2. The first URL in `photos[]` loads as an interior room photo (visually inspect at least 5)
3. `location.city` / `location.neighborhood` are still present and parseable by the existing borough detection
4. `fees[]` contains pet policy data on at least some listings
5. Run duration stays under 10 minutes for 20 items (extrapolate to 300)
6. Cost per run is acceptable (it's flat $5/month so cost is not the concern; confirm the actor doesn't hit timeouts)

If all 6 checks pass, switch `APIFY_ACTOR_ID` and update the normalizer to read `photos[0]` as primary image and `fees[]` for pet policy.

---

## 3. Long-Term Target: `memo23~apify-streeteasy-cheerio`

### Why this is the long-term winner

`memo23~apify-streeteasy-cheerio` is the only candidate whose data source is structurally aligned with what NYC apartment searchers actually use. StreetEasy is where the inventory lives, where the photos are published, and where the listings have the highest data quality for NYC-specific rental fields.

Its advantages are product-level, not just schema-level:

- **StreetEasy listing URLs** — the product's CTA sends users to the external listing. Sending them to StreetEasy is a better user experience than sending them to Apartments.com. NYC renters trust StreetEasy.
- **Net-effective pricing** — explicitly captured. This is the only candidate that surfaces NYC's "1–2 months free" concession structure as data, not as a regex match against description text. That's a meaningful improvement to Heed's Take incentive detection.
- **Borough and neighborhood directly** — StreetEasy uses standard NYC neighborhood names. The bespoke `QUEENS_CITIES` mapping in the current normalizer exists because Apartments.com names Queens neighborhoods as cities. StreetEasy does not have this problem.
- **Unit-level listings** — StreetEasy has unit-level data, not just building-level. This means individual apartments, not just "this building has 1–2 bed units available."
- **Photo quality** — StreetEasy enforces photo standards. The `media.photos[].url` array (if confirmed) is the cleanest path to real interior photos.

### Why it is not the immediate pick

Three things prevent it from being the immediate migration target:

1. **Schema is entirely unconfirmed.** No field names have been validated by a live run. The normalizer rewrite is significant.
2. **MAU is only 8.** Even with 162 monthly runs, only 8 unique users means slow breakage detection and low maintenance pressure on the actor developer.
3. **Pricing has changed 6 times in 13 months.** From $25 → $15 → $8 → $15 → $19 → $25. This is a business risk signal. The actor may be underpriced, which historically correlates with churn.

### Exact next validation step

Run a 10-item spike against `memo23~apify-streeteasy-cheerio` targeting NYC rentals. Confirm:
1. `media.photos[].url` (or equivalent) is present and non-empty for at least 80% of items
2. Photos and floor plans are in separate arrays (not mixed)
3. At least 5 photo URLs visually confirm interior room photos
4. Borough is returned as a direct field OR derivable from neighborhood name without the QUEENS_CITIES map
5. Neighborhood names match what NYC renters use (Williamsburg, Astoria, Harlem — not neighborhood IDs or codes)
6. Listing URL is a stable StreetEasy deep-link that opens without auth
7. Pet policy is returned in a structured field (not only buried in description)
8. Price is monthly rent in USD, not sale price or annual rent
9. Run cost is acceptable ($25/month flat regardless)

If checks 1–6 pass, begin writing a parallel normalizer for StreetEasy output. Do not touch production until the normalizer is tested against 100+ items and the borough derivation is confirmed clean.

---

## 4. Eliminated Candidates

### `sovereigntaylor~zillow-rentals-scraper`
Eliminated. 79% success rate means 1 in 4 daily runs fails. This is unacceptable for an unattended cron that runs once per day. At that failure rate, the product would have stale or empty listings for roughly 8 days per month.

### `silentflow~realtor-rental-scraper`
Eliminated. 2 total users and 0 reviews. There is no meaningful production evidence. Realtor.com is also not a primary NYC rental marketplace. The detailed pet policy claim is interesting but useless without production validation.

### `epctex~trulia-scraper`
Eliminated as a primary candidate. 87% success rate (~8 failures/month), Trulia is a declining platform in NYC (it redirects to Zillow in many markets), and the NYC rental inventory depth is lower than all primary candidates. Pet policy is not mentioned in the actor description. The only merit is the 8-review rating and the same-developer familiarity — neither is enough to overcome the structural platform weakness.

### `parseforge~zillow-rentals-scraper`
Not eliminated but not prioritized. 10 total users and 1 review is too thin to trust for production. If both the non-API apartments scraper and StreetEasy fail validation, Zillow via parseforge would be the next spike to run. Confirm then.

---

## 5. Migration Sequencing

```
TODAY — NOW
  Keep current provider running. Do not change production cron.

STEP 1 (next 1–3 days)
  Run 20-item spike: epctex~apartments-scraper (non-API, browser version)
  NYC startUrls only, same structure as production.
  Confirm: photos[], location fields, pet fees, run duration.

STEP 2 (if spike passes)
  Change APIFY_ACTOR_ID to the non-API actor.
  Update normalizer: read photos[0] as primary image_url.
  Update normalizer: parse fees[] for pet policy.
  Test with a manual run before re-enabling cron.
  Re-enable daily cron. Monitor image_url population rate in Supabase.

STEP 3 (parallel, after Step 1)
  Run 10-item spike: memo23~apify-streeteasy-cheerio
  NYC rentals startUrls.
  Confirm: photo field names, floor plan separation, borough format,
  neighborhood names, listing URL format, pet policy field, price field.

STEP 4 (if Step 3 spike passes)
  Write StreetEasy normalizer as a parallel module.
  Test against 100+ items offline.
  Run DB migration to accommodate any new field names or structures.
  Replace the non-API apartments scraper with StreetEasy.

STEP 4 (if Step 3 spike fails)
  Stay on non-API apartments scraper.
  Spike parseforge/zillow-rentals-scraper as the next alternative.
```

---

## 6. Why Pet Metadata Did Not Change the Ranking

Pet data improved the non-API apartments scraper's score marginally (it has confirmed `fees[]` per-species breakdown) and the StreetEasy option's score (it explicitly claims pet policies and net-effective pricing). But neither of these boosted them above each other — both were already the top two candidates for image quality and data structure reasons.

The pet field advantage of the non-API apartments scraper (confirmed, per-species) over StreetEasy (claimed, unconfirmed) is meaningful as a validation incentive, not a ranking driver.

Pet data did help eliminate some candidates: the Trulia actor does not mention pet policy at all, which combined with its other weaknesses makes it clearly inferior. The Realtor actor has the best-claimed pet specificity, but 2 total users means the claim cannot be trusted.

In short: pet fields confirmed the ranking but did not create it.

---

## 7. Confidence Statement

This recommendation is made with imperfect evidence. No live spike has been run against the non-API apartments scraper or the StreetEasy actor. The confidence levels are:

- **Current provider weaknesses:** High confidence (confirmed by live spike and codebase)
- **Non-API apartments scraper `photos[]` field exists:** High confidence (GitHub README, explicit JSON example)
- **Non-API apartments scraper `photos[]` contains interior room photos:** Medium confidence (inferred from browser-based scraping of rendered pages; not confirmed visually)
- **StreetEasy photo/floor plan separation:** Medium confidence (claimed in actor description; consistent with StreetEasy platform behavior; not confirmed by output schema or live run)
- **StreetEasy borough naming quality:** Medium confidence (platform is NYC-native; field structure unknown)
- **Zillow candidates:** Low confidence on all dimensions

The recommendation stands at these confidence levels because:
- The non-API switch is low-risk enough to justify without perfect evidence (same developer, same Apify pattern, same source site, confirmed field)
- The StreetEasy validation is explicitly sequenced as a parallel spike, not a blind migration
- Both higher-ranked candidates have clear validation paths that can close open questions quickly

If the non-API apartments scraper spike fails on photo quality (interior rooms are not actually in `photos[]`), the recommendation shifts to StreetEasy as the immediate target, not back to the API version.

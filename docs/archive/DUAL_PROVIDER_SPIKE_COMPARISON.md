# DUAL_PROVIDER_SPIKE_COMPARISON

Date: 2026-03-26

## Spike Results

| Actor | Status | Items | Run time | Cost | Outcome |
|---|---|---|---|---|---|
| `memo23~apify-streeteasy-cheerio` | **RAN** | 10 | 8s | $0.003 | Data returned, photos not accessible |
| `epctex~apartments-scraper` (non-API) | **RAN** | 0 | 14.8s | $0.003 | Deprecated — zero items, actor self-reports broken |

Both spikes ran against live actors on the same Apify account. Both are confirmed results, not projections.

---

## Root Cause: epctex non-API

Actor startup log:

> *"Use our new Apartments Scraper API with pay-per-event pricing. Due to new security protections on Apartments.com, this is the only working solution."*

The browser-based scraper is deprecated by its own developer. Apartments.com's anti-bot protection prevents it from scraping. It returns 0 items and exits cleanly. The `photos[]` field documented in the GitHub README exists in the schema but is unreachable because the actor cannot fetch any listings.

The epctex family status after both spikes:
- `epctex~apartments-scraper` (browser, non-API): **dead** — 0 items
- `epctex~apartments-scraper-api` (current production): **working** but confirmed image failure

There is no epctex path that solves the image problem.

---

## 1. Image Field Structure

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Photo field name | `node.photos[]` | N/A — 0 items returned |
| Photo field type | Array of `{__typename, key}` objects | N/A |
| Primary photo field | `node.leadMedia.photo.key` | N/A |
| Floor plan field | `node.leadMedia.floorPlan.key` (separate) | N/A |
| Photo count per item | 15–42 (avg ~26) — 10/10 items | N/A |
| **Can URL be constructed?** | **NO — CDN locked** | N/A — actor produces no items |
| Image accessible as `<img src>`? | **NO** | N/A |

**StreetEasy CDN probe results (all patterns tested):**

| URL pattern | Result |
|---|---|
| `cdn-photos.streeteasy.com/nyc/photos/{key}.jpg` | 301 → `streeteasy.com` homepage |
| `cdn-photos.streeteasy.com/nyc/photos/{key}?w=800` | 403 Forbidden |
| `img.streeteasy.com/nyc/photos/{key}.jpg` | 403 AccessDenied (AWS S3) |
| `streeteasy.com/img/{key}.jpg` | 200 — SVG placeholder (7,326 bytes), not a photo |
| `streeteasy.com/photos/{key}.jpg` | 200 — SVG placeholder (7,326 bytes), not a photo |
| With `Referer: streeteasy.com` | 301 → `streeteasy.com` (same result) |
| With browser User-Agent | 301 → `streeteasy.com` (same result) |

No tested URL pattern returns a real photo. All paths either redirect to the homepage or return an SVG placeholder. Photo keys are private CDN identifiers requiring StreetEasy session authentication.

---

## 2. Photo Content Quality

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Photos visually inspected | **Cannot — URLs not constructable** | **Cannot — 0 items** |
| Floor plans structurally separated | YES — `leadMedia.floorPlan` distinct key (7/10) | N/A |
| Photo count per item | 15–42 ✓ | N/A |
| Platform photo standards | StreetEasy enforces listing-quality photos | Moot |

---

## 3. Borough Quality

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Borough field | `node.areaName` (neighborhood name) | N/A — 0 items |
| Sample values | Fort George, Mott Haven, Crown Heights, Fort Greene, Coney Island, Greenpoint, Sutton Place, Lincoln Square, Financial District, Saint George | N/A |
| Borough derivation accuracy | 10/10 correct with neighborhood→borough map | N/A |
| All 5 boroughs present | YES — Manhattan ×4, Brooklyn ×4, Bronx ×1, Staten Island ×1 | N/A |
| Mapping required | New `areaName`→borough map (~200 NYC neighborhoods) | N/A |

---

## 4. Neighborhood Quality

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Field | `node.areaName` | N/A |
| Quality | **Excellent** — real NYC names every time | N/A |
| QUEENS_CITIES hack needed | **No** — Queens neighborhoods come as names directly | N/A |

---

## 5. Listing URL Quality

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Raw field | `node.urlPath` (relative) | N/A |
| Full URL | `https://streeteasy.com` + `node.urlPath` | N/A |
| Example | `https://streeteasy.com/building/forty-six-fifty/1806` | N/A |
| Brand | StreetEasy | N/A |
| Bot protection on landing page | PerimeterX — unverified if users hit it | N/A |

---

## 6. Price / Bedrooms / Bathrooms

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Price field | `node.price` — integer, 10/10 present | N/A |
| Price range | $3,166–$17,693/month | N/A |
| Net-effective price | `node.netEffectivePrice` — 6/10 non-zero | N/A |
| Months free | `node.monthsFree` — 0–3.0 | N/A |
| No-fee | `node.noFee` — present | N/A |
| Bedrooms | `node.bedroomCount` — integer, 10/10 | N/A |
| Bathrooms | `node.fullBathroomCount` — integer, 10/10 | N/A |

---

## 7. Pet Policy

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Pet field | **None** — not in schema | N/A |
| Regression vs current | YES — current has `petFriendly` + `petPolicy` | N/A |

---

## 8. Schema Compatibility

| Dimension | `memo23~apify-streeteasy-cheerio` | `epctex~apartments-scraper` |
|---|---|---|
| Data structure | `item.node.*` — GraphQL wrapper | N/A |
| Normalizer rewrite scope | Full rewrite | N/A |
| Image pipeline | Broken — keys not usable | Moot |
| Borough detection | New logic from `areaName` | N/A |
| Pet field | Disappears entirely | N/A |

---

## 9. What Each Actor Solves and Doesn't Solve

### `memo23~apify-streeteasy-cheerio`

**Solves:**
- Neighborhood quality (real NYC names, no QUEENS_CITIES hack)
- Net-effective pricing and concessions (structured fields)
- Borough coverage (all 5, derivable from areaName)
- Price / beds / baths (clean integer fields)

**Does not solve:**
- Image problem — photo keys are not publicly accessible URLs
- Pet policy — no pet field in schema

**Is a blocker resolved?** The photo URL problem is the only blocker. It may be resolvable by contacting the actor developer. If they add full CDN URLs to the output, StreetEasy becomes viable.

### `epctex~apartments-scraper` (non-API)

**Solves:** Nothing — actor is deprecated and returns 0 items.

**Does not solve:** Everything. The actor cannot run.

---

## 10. Checklist Score (LISTING_API_SELECTION_CHECKLIST.md)

| Criterion | Max | StreetEasy (observed) | epctex non-API (observed) |
|---|---|---|---|
| 1. Image quality | 25 | **0** — photo URLs not constructable | **0** — no items returned |
| 2. NYC coverage | 20 | **18** — all 5 boroughs, real neighborhoods | **0** — 0 items |
| 3. Schema compatibility | 15 | **5** — full rewrite, broken images, no pets | **0** — 0 items |
| 4. Stability | 15 | **7** — 97% success rate, 105 users, 8 MAU | **0** — deprecated |
| 5. Cost | 10 | **8** — $15/month flat | **0** — $5/month but produces nothing |
| 6. Implementation effort | 8 | **3** — full rewrite | **0** — migration would break production |
| 7. External listing URL | 4 | **2** — StreetEasy brand, bot protection unverified | **0** — 0 items |
| 8. Rental-field completeness | 3 | **2** — concessions ✓, pets ✗ | **0** — 0 items |
| **TOTAL** | **100** | **45** | **0** |

StreetEasy at 45 is not a passing score, but it is the only actor that returned usable data. epctex non-API scored 0 across every criterion because it produced no output.

---

## Summary

Neither actor is ready to replace the current provider today. Both have a critical failure in the image criterion. The difference is:

- **StreetEasy's failure is potentially recoverable.** The data exists and is rich. The photo URL problem requires the actor developer to return full CDN URLs instead of keys — a single field change in the actor output.
- **epctex non-API's failure is not recoverable.** The actor is deprecated. Apartments.com's security protections block it. The developer has redirected users to the API version, which is the current provider with the known image problem.

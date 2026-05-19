# LISTING API PROVIDER COMPARISON

Date: 2026-03-25
Checklist used: `LISTING_API_SELECTION_CHECKLIST.md`
Requirements basis: `LISTING_API_REQUIREMENTS_REPORT.md`

---

## Evidence Sources

Each candidate was evaluated using:
- Apify Store actor metadata via API (`api.apify.com/v2/acts/{id}`)
- GitHub READMEs where available (`epctex-support/apartments-scraper`)
- `SCRAPER_VISUALS_SPIKE_REPORT.md` — live 10-item test of current provider
- `SCRAPER_OPTIONS_REPORT.md` — prior research memo
- Codebase inspection of current normalizer (`lib/apify-normalize.ts`)
- Current production cron behavior (`vercel.json`, `app/api/apify/`)

Evidence confidence is noted per candidate. Where schema was not confirmed by live run or public output schema, it is marked as **claimed** vs **confirmed**.

---

## Candidates

Eight candidates are evaluated. The user-specified five categories produced eight distinct actors worth scoring, including one important variant (`epctex~apartments-scraper`, the non-API browser version) discovered during research.

---

## Candidate 1: `epctex~apartments-scraper-api` (current production)

### Marketplace stats
- Rating: 5/5 (11 reviews)
- Total users: 154 | MAU (30d): 56
- Pricing: Pay-per-event (~$8–11/month at 300 items/day without visuals; ~$12/month with visuals)
- Last modified: within last 30 days (confirmed active)

### Image evidence
**Source: live spike (`SCRAPER_VISUALS_SPIKE_REPORT.md`) — confirmed**

- `images[]` array: 0/10 items had any photo, even with `includeVisuals: true`
- `models[0].image`: 6/10 items had a photo-like URL; 0/10 were classified as floor-plan-like
- No `photos[]` array exists in the API version (confirmed by normalizer code and GitHub README for the non-API version)
- The images present via `models[0].image` are thumbnails or building exteriors — not confirmed interior room photos
- Current production runs with `includeVisuals: false`, making images empty by default

**Image verdict:** Active failure. The `photos[]` array with real gallery images belongs to a different actor (the non-API browser version). This actor does not have a confirmed path to reliable interior room photos.

### Pet policy evidence
**Source: `ApartmentsItem` type in `lib/apify-normalize.ts` — confirmed in codebase**

- `petFriendly: boolean` — discrete binary field
- `petPolicy: string` — free-text policy description
- The non-API README additionally shows a `fees[]` array with structured "Pet Policies (Pets Negotiable)" → "Dogs Allowed" / "Cats Allowed" with weight limits and fees
- Whether the API version returns `fees[]` is unconfirmed; the normalizer only reads `petFriendly` and `petPolicy`
- When present, `petFriendly` is reliable for binary decisions (pets allowed/not); `petPolicy` enables richer nuance
- Pet data is currently stripped from the Supabase upsert to protect manually curated values

**Pet verdict:** Binary pet policy is available and confirmed. Richer structured per-species policy (dogs/cats separately) is available in the non-API version but unconfirmed in the API version.

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 6 | Confirmed active failure. `images[]` empty. `models[0].image` covers 60% but unconfirmed interior photos. No gallery. |
| NYC coverage | 20 | 12 | All 5 boroughs via startUrls. Good volume. But Apartments.com biased to managed buildings, not individual units. For-sale contamination present (isRental() check needed). Not NYC-native. Borough derived via bespoke city-name map. |
| Schema compatibility | 15 | 14 | Already fully integrated. Entire normalizer (`ApartmentsItem`) built around this schema. Only change needed is image field priority and/or enabling visuals. |
| Stability | 15 | 13 | 11 reviews, 56 MAU, 154 total users. Pay-per-event = active user base likely not running it daily. Strong maintenance signal from epctex. |
| Cost | 10 | 10 | ~$8–12/month at current volume. Cheapest per-item of all candidates. |
| Implementation effort | 8 | 7 | Already implemented. Fix is incremental: change `includeVisuals`, adjust normalizer image priority. |
| External listing URL | 4 | 3 | Apartments.com deep-links. Stable, no login wall. Less trusted by NYC renters than StreetEasy/Zillow. |
| Rental-field completeness | 3 | 2 | `petFriendly` + `petPolicy` confirmed. No broker fee field. No structured concession field. |
| **TOTAL** | **100** | **67** | |

**Confidence:** High on weaknesses (image failure confirmed by live spike). High on strengths (schema compatibility confirmed by production code).

**Fit classification:** Proven fit for everything except the one thing that matters most right now — images.

---

## Candidate 2: `epctex~apartments-scraper` (non-API, browser version)

*Not in the original candidate list but discovered as a critical variant. Included because it solves the image problem at minimum migration cost.*

### Marketplace stats
- Rating: 5/5 (12 reviews)
- Total users: 972 | MAU (30d): 13
- Pricing: $5/month or $30/month (tiered; exact tier difference unconfirmed)
- Same developer (epctex) as current production actor

### Image evidence
**Source: GitHub README (`epctex-support/apartments-scraper`) — confirmed**

```json
"photos": [
  "https://images1.apartments.com/i2/cS0Cu8ytY9zn8aI0V3DcsPiSca-7KgPPd-tOowXs5Uw/111/...",
  "https://images1.apartments.com/m2/ogrZ5C9tUeyJJw1Rg_NLfNm3O6sorfEMC1OyLLDgLko/H330W495/...",
  "https://images1.apartments.com/i2/xhlEsuSaTc0Oc7ZA8jNyLrpMwmkgkgE3jW9WzfJJ0bM/117/..."
]
```

- `photos[]` is a confirmed gallery array of direct CDN URLs
- These are distinct from `models[0]` (which the API version uses)
- Browser-based scraping fetches the rendered property page, so the full gallery is accessible
- Photo quality likely matches what users see on Apartments.com — interior rooms, community areas
- Floor plan separation is not confirmed; they may be mixed into `photos[]`

**Image verdict:** Strong. Has the `photos[]` gallery array that the API version lacks. Real coverage rate and photo quality not confirmed by live spike, but the field structure is correct.

### Pet policy evidence
**Source: GitHub README — confirmed**

```json
"fees": [
  {
    "title": "Pet Policies (Pets Negotiable)",
    "policies": [
      {
        "header": "Dogs Allowed",
        "values": [{"key": "Weight limit", "value": "40 lb"}, {"key": "One time Fee", "value": "$250"}]
      }
    ]
  }
]
```

- Most detailed pet policy structure of all candidates
- Per-species breakdown (dogs vs cats separately)
- Includes weight limits and fee amounts
- Parsing requires reading `fees[].title.includes('Pet')` → `fees[].policies[].header`
- Richer than any other candidate; sufficient to power future Heed's Take pet logic

**Pet verdict:** Best-in-class pet policy structure. Sufficient to distinguish dogs/cats separately, not just a binary allowed/not-allowed.

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 17 | Confirmed `photos[]` gallery array with direct CDN URLs. Real gallery photos plausible (browser scraper fetches rendered page). Floor plan separation not confirmed — may be mixed in. No live spike yet. |
| NYC coverage | 20 | 12 | Same Apartments.com coverage as API version. All boroughs via startUrls. Same caveats: building-biased, for-sale contamination, not NYC-native. |
| Schema compatibility | 15 | 11 | Same maker, similar structure. But `photos[]` requires normalizer update (current code reads `models[0].image`). `fees[]` pet policy requires new parsing logic. Borough derivation reusable. Sync/collect route reusable. |
| Stability | 15 | 9 | 12 reviews (highest), 972 total users (highest by far). But MAU dropped to 13 — strong signal that users migrated to the API version. Lower maintenance priority if epctex favors the API version going forward. |
| Cost | 10 | 10 | $5/month flat. Cheapest overall. |
| Implementation effort | 8 | 6 | Same Apify API pattern. Normalizer changes needed: add `photos[]` field, parse `fees[]` for pet policy. Moderate effort. |
| External listing URL | 4 | 3 | Same Apartments.com URLs. |
| Rental-field completeness | 3 | 3 | Best pet policy structure. `fees[]` includes lease and policy details. |
| **TOTAL** | **100** | **71** | |

**Confidence:** Medium-high. Image field structure confirmed from README. Real coverage quality not confirmed by live spike.

**Fit classification:** Plausible fit. Lowest-migration-cost path to solving the image problem. Must be validated with a live NYC spike before production migration.

**Critical risk:** Low MAU (13) suggests the user base migrated away from this version. If epctex deprioritizes it, schema breakage may come without warning.

---

## Candidate 3: `memo23~apify-streeteasy-cheerio`

### Marketplace stats
- Rating: 5/5 (4 reviews)
- Total users: 105 | MAU (30d): 8 | 30-day runs: 162/167 succeeded (97%)
- Pricing: $25/month flat (pricing has changed 6 times since Feb 2025 — volatility noted)
- Last run: March 25, 2026 (actively running as of today)

*Note on MAU vs runs: 8 unique users ran 162 times in 30 days. This is consistent with automated daily cron jobs. The low MAU is not a signal of low use — it means 8 teams are running it continuously. Still a small user base for breakage detection.*

### Image evidence
**Source: Apify actor metadata description + prior research memo — claimed, not confirmed by live spike**

- Actor description explicitly lists: "Photos, floor plans, videos, 3D tours" as separate media assets
- Prior research (`SCRAPER_OPTIONS_REPORT.md`) identified `media.photos[].url` and `media.floorPlans` as separate fields
- StreetEasy as a platform maintains high photo quality standards — listings on StreetEasy have professional interior photos as a norm
- The structural separation of photos from floor plans (if confirmed) is the strongest schema advantage of any candidate
- **Not confirmed by live spike. Cannot guarantee field names or coverage rate.**

**Image verdict:** Plausible high quality. StreetEasy's native data is the cleanest source for NYC rental photos. The structural separation of photos vs floor plans is exactly what the app needs. Must be validated before committing.

### Pet policy evidence
**Source: Apify actor metadata — claimed**

- Actor description explicitly mentions: "Pet policies" and "Building policies"
- StreetEasy displays pet policy on listing pages (pets allowed, breed restrictions, pet deposit)
- No confirmed field names (e.g., `petPolicy`, `pets`, `petsAllowed`)
- Additionally: "net-effective pricing" is explicitly mentioned — this is a StreetEasy-specific NYC rental concept (1–2 months free on 12-month leases). No other candidate mentions this.

**Pet verdict:** Pet policy claimed but unconfirmed field structure. Net-effective pricing is a meaningful bonus for NYC users (currently detected only via description keyword matching in the app, which is fragile).

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 16 | Strong claim: photos separated from floor plans. StreetEasy native photos are high quality. But field names unconfirmed. Penalized for no live spike. |
| NYC coverage | 20 | 19 | Best possible. NYC-native marketplace, all 5 boroughs, rental-first inventory. Neighborhood names follow NYC conventions. Unit-level listings, not just building-level. |
| Schema compatibility | 15 | 7 | Full normalizer rewrite required. Different field names, different location structure. Borough may come as a direct field (potentially easier than city-name derivation). Sync/collect routes reusable. High-effort remap. |
| Stability | 15 | 8 | 4 reviews, 8 MAU. 97% 30-day success rate. Actively running as of today. But pricing has changed 6x since launch — ongoing pricing volatility is a business risk. Low MAU = slow breakage detection if target site changes. |
| Cost | 10 | 9 | $25/month flat. Predictable. Acceptable for MVP. Pricing history suggests it may increase further. |
| Implementation effort | 8 | 4 | Same Apify pattern. But full normalizer remap. Borough field derivation unknown. Image field names unknown. Pet field names unknown. Medium-high effort. |
| External listing URL | 4 | 4 | StreetEasy deep-links. The gold standard for NYC rental trust. No login wall for rental listings. |
| Rental-field completeness | 3 | 3 | Net-effective pricing explicitly mentioned (NYC-unique). Pet policies mentioned. Lease terms mentioned. Best rental-specific field set. |
| **TOTAL** | **100** | **70** | |

**Confidence:** Medium. Strong domain fit (StreetEasy = best NYC source). But too much is unconfirmed. A single 10-item spike would close most open questions.

**Fit classification:** Plausible fit with high upside. Best long-term candidate if validated. Not ready for production without a spike.

---

## Candidate 4: `parseforge~zillow-rentals-scraper`

### Marketplace stats
- Rating: 5/5 (1 review — insufficient signal)
- Total users: 10 | MAU (30d): 5
- Pricing: $19/month flat
- 30-day success rate: 92/93 (98.9%)

### Image evidence
**Source: Actor description — claimed, not confirmed**

- "property photos" and "photo URLs for listing galleries" mentioned
- Zillow rental listings typically have real interior photos (landlord-uploaded or professional)
- No floor plan separation confirmed
- No field names confirmed (field name unknown)

**Image verdict:** Plausible — Zillow has decent photo coverage on rental listings. But too few users and runs to confirm consistent output quality.

### Pet policy evidence
**Source: Actor description — claimed**

- "pet policy text" mentioned
- Likely embedded in amenities or a free-text field
- Zillow displays pet policy on rental listings but field structure on Apify output is unconfirmed
- "Lease terms and security deposits" mentioned — some NYC-relevant context

**Pet verdict:** Pet policy present in some form. Structural quality unconfirmed. Likely text-based, not discrete field.

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 12 | "Gallery photos" claimed. Zillow has real interior photos as a norm. But no field name confirmation, no coverage data, no floor plan separation confirmed. |
| NYC coverage | 20 | 12 | Zillow has NYC rentals but is national. Rental-specific actor reduces for-sale noise. Neighborhood names less precise than StreetEasy. Borough derivation method unknown. |
| Schema compatibility | 15 | 6 | Unknown field names. Full normalizer remap needed. Borough derivation unknown. GPS coordinates available (bonus). Same Apify pattern. |
| Stability | 15 | 5 | 1 review (insufficient), 10 total users, 5 MAU. Very new, very small. 98.9% success rate is promising but based on only 93 runs. |
| Cost | 10 | 9 | $19/month flat. Reasonable. |
| Implementation effort | 8 | 4 | Same Apify pattern. Full normalizer remap. Unknown field names increase risk. |
| External listing URL | 4 | 3 | Zillow rental deep-links. Recognized brand. Some listings may require contact-agent flow. |
| Rental-field completeness | 3 | 1 | Pet policy claimed but structure unclear. No broker fee. No concession data. |
| **TOTAL** | **100** | **52** | |

**Confidence:** Low. Not enough evidence on image quality, field structure, or NYC borough/neighborhood naming.

**Fit classification:** Risky fit. Too little evidence for a production decision. Would require a full validation spike before even being ranked above current provider.

---

## Candidate 5: `sovereigntaylor~zillow-rentals-scraper`

### Marketplace stats
- Rating: 0 reviews
- Total users: 15 | MAU (30d): 5
- Pricing: unclear
- 30-day success rate: 95/120 (79%) — **this is a disqualifying signal**

### Image evidence
**Source: Actor description — claimed**

- "high-resolution photo URLs for listing galleries" — most explicit gallery language of the Zillow candidates
- But 79% success rate means 25% of runs fail or time out
- At daily runs, that means ~7 failed syncs per month with no listings

**Image verdict:** Best image language of the Zillow group, but the 79% success rate means the actor is unreliable enough to void that advantage.

### Pet policy evidence
- "pet policy text" and "amenities lists" mentioned
- Unconfirmed structure

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 11 | Strong language ("high-resolution gallery") but no confirmation and unstable actor. |
| NYC coverage | 20 | 11 | Zillow national aggregator, similar to parseforge. |
| Schema compatibility | 15 | 5 | Unknown. Same Apify pattern. |
| Stability | 15 | 3 | 0 reviews, 15 users. 79% success rate is a hard disqualifier for daily unattended runs. 1 in 4 runs fails. |
| Cost | 10 | 6 | Pricing unclear. |
| Implementation effort | 8 | 3 | Unknown schema, same Apify pattern. |
| External listing URL | 4 | 3 | Zillow links. |
| Rental-field completeness | 3 | 1 | Claims pet policy text. |
| **TOTAL** | **100** | **43** | |

**Confidence:** Very low.

**Fit classification:** Risky fit. Disqualified by stability criterion (79% success rate). Do not use for daily unattended runs.

---

## Candidate 6: `silentflow~realtor-rental-scraper`

### Marketplace stats
- Rating: 0 reviews
- Total users: 2 | MAU (30d): 1
- Pricing: $14.99/month
- 30-day success rate: 28/28 runs (100%) — but 28 runs from 2 total users is an insignificant sample

### Image evidence
**Source: Actor description — claimed**

- "photo URLs provided in structured format"
- No coverage rate. No field name. No confirmation.
- Realtor.com has rental listings but is not the primary NYC rental marketplace

**Image verdict:** Claimed but entirely unproven. 2 total users means there is essentially no production evidence.

### Pet policy evidence
**Source: Actor description — claimed, notably detailed**

- "Allowed pets, deposits, fees, policy text"
- Most granular pet policy language of all candidates
- Realtor.com displays detailed pet policies including breed restrictions, weight limits, and pet deposits
- This is the best-documented pet policy structure in the candidate set (even better than memo23 in terms of specificity)
- If the field output matches the description, it could power per-species Heed's Take logic

**Pet verdict:** Best claimed pet policy specificity. But entirely unconfirmed by any production run. 2 users is not enough to trust the schema.

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 8 | "Structured format" photos claimed. Realtor.com has photos. But 2 users = no production evidence at all. |
| NYC coverage | 20 | 9 | Realtor.com has NYC rentals but is thinner than StreetEasy or Zillow for NYC specifically. Not NYC-native. |
| Schema compatibility | 15 | 5 | "70+ fields" sounds rich but unknown names. Full remap needed. |
| Stability | 15 | 2 | 0 reviews, 2 users, 28 runs total. Effectively untested. |
| Cost | 10 | 10 | $14.99/month. Cheapest flat-fee. |
| Implementation effort | 8 | 2 | Complete unknown. Same Apify pattern but schema entirely uncharted. |
| External listing URL | 4 | 2 | Realtor.com links. Less trusted by NYC renters than StreetEasy or Zillow. |
| Rental-field completeness | 3 | 2 | Best claimed specificity (per-species pet policy, deposits). But unconfirmed. |
| **TOTAL** | **100** | **40** | |

**Confidence:** Very low. Essentially no production evidence.

**Fit classification:** Risky fit. Do not use without a live validation spike and a significantly larger user base signal.

---

## Candidate 7: `epctex~trulia-scraper`

### Marketplace stats
- Rating: 5/5 (8 reviews)
- Total users: 38 | MAU (30d): 3
- Pricing: $15/month
- 30-day success rate: 54/62 (87%) — notable failure rate

### Image evidence
**Source: Actor description — claimed**

- "images and image URLs" mentioned
- Trulia property listings have photos, but the platform is less photo-rich than StreetEasy or Zillow
- No gallery field name confirmed
- No floor plan separation confirmed
- 87% success rate means ~8 failed runs per month — at daily runs, about 4 failures/month

**Image verdict:** Generic image claim. No gallery structure confirmed. Trulia's NYC rental photo quality is lower than StreetEasy. Success rate introduces reliability risk.

### Pet policy evidence
**Source: Actor description — not explicitly mentioned**

- Pet policy is NOT listed in the actor description
- Trulia does show pet policy on listing pages but whether this is captured is unconfirmed
- Mixed sale/rental output means extra filtering is required

**Pet verdict:** Unconfirmed. Not mentioned in description. Probably available in description text but not as a discrete field.

### Scoring

| Criterion | Max | Score | Rationale |
|---|---|---|---|
| Image quality | 25 | 9 | Generic "images and image URLs" claim. No gallery structure. 87% success rate reduces reliability. Trulia photos thinner than StreetEasy/Zillow for NYC. |
| NYC coverage | 20 | 10 | Trulia has NYC coverage but is a national aggregator. Not rental-specific — sale/rental mixed, requires type filtering. NYC inventory depth lower than StreetEasy or Apartments.com. |
| Schema compatibility | 15 | 6 | Same epctex maker — familiar coding style. But rental/sale type filtering needed. Different schema from current. Full normalizer remap required. |
| Stability | 15 | 8 | 8 reviews (good), 38 users, but 3 MAU and 87% success rate is a concern. Low and declining active use. |
| Cost | 10 | 10 | $15/month flat. |
| Implementation effort | 8 | 4 | Same epctex style helps. Rental filtering adds complexity. |
| External listing URL | 4 | 2 | Trulia links. Lower NYC brand recognition than StreetEasy or Zillow. |
| Rental-field completeness | 3 | 1 | Listing type (rental/sale) is distinguishable. Pet policy unconfirmed. |
| **TOTAL** | **100** | **50** | |

**Confidence:** Medium on weaknesses (NYC coverage and image quality are structurally limited by Trulia's platform). Low on strengths (image fields unconfirmed by live run).

**Fit classification:** Risky fit. The 87% success rate and low MAU are ongoing concerns. Trulia is a declining platform that redirects to Zillow in many markets. Not recommended as a primary source.

---

## Candidate 8: `silentflow~trulia-rental-scraper` (additional discovery)

*Found during research. Rental-specific variant of Trulia actor.*

### Marketplace stats
- Rating: unknown from available data
- Very low user base (similar to other silentflow actors)
- Pricing: pay-per-event variant exists (`silentflow~trulia-rental-scraper-ppe`)

**Not scored in full** — insufficient data and too similar to the instability pattern of other silentflow actors. Treat as disqualified pending evidence.

---

## Comparative Scoring Summary

| Candidate | Image (25) | NYC (20) | Schema (15) | Stability (15) | Cost (10) | Effort (8) | URL (4) | Rental (3) | **Total** |
|---|---|---|---|---|---|---|---|---|---|
| `epctex~apartments-scraper` (non-API) | 17 | 12 | 11 | 9 | 10 | 6 | 3 | 3 | **71** |
| `memo23~apify-streeteasy-cheerio` | 16 | 19 | 7 | 8 | 9 | 4 | 4 | 3 | **70** |
| `epctex~apartments-scraper-api` (current) | 6 | 12 | 14 | 13 | 10 | 7 | 3 | 2 | **67** |
| `parseforge~zillow-rentals-scraper` | 12 | 12 | 6 | 5 | 9 | 4 | 3 | 1 | **52** |
| `epctex~trulia-scraper` | 9 | 10 | 6 | 8 | 10 | 4 | 2 | 1 | **50** |
| `sovereigntaylor~zillow-rentals-scraper` | 11 | 11 | 5 | 3 | 6 | 3 | 3 | 1 | **43** |
| `silentflow~realtor-rental-scraper` | 8 | 9 | 5 | 2 | 10 | 2 | 2 | 2 | **40** |

---

## Image Problem: Does Each Candidate Solve It?

| Candidate | Solves the image problem? |
|---|---|
| `epctex~apartments-scraper` (non-API) | **Likely yes** — confirmed `photos[]` gallery array from GitHub README. Needs live NYC spike to confirm interior photo quality and coverage rate. |
| `memo23~apify-streeteasy-cheerio` | **Plausibly yes** — claimed photo/floor-plan separation. StreetEasy has strong native photo standards. Unconfirmed by live spike. |
| `epctex~apartments-scraper-api` (current) | **No** — confirmed failure. `images[]` empty even with `includeVisuals: true`. `models[0].image` unreliable for interior photos. |
| `parseforge~zillow-rentals-scraper` | **Unconfirmed** — "gallery photos" language present but field names and coverage unknown. |
| `epctex~trulia-scraper` | **Unlikely** — generic "images and image URLs" claim, Trulia photo quality lower, 87% success rate. |
| `sovereigntaylor~zillow-rentals-scraper` | **Unconfirmed** — strong language but 79% success rate disqualifies it. |
| `silentflow~realtor-rental-scraper` | **Unknown** — no production evidence. |

---

## Pet-Related Data: Evaluation for Future Heed's Take Support

| Candidate | Pet field quality | Useful for Heed's Take? |
|---|---|---|
| `epctex~apartments-scraper` (non-API) | Confirmed best-in-class: `fees[]` with per-species breakdown (dogs/cats separately), weight limits, fees | **Yes, strongly.** Sufficient to distinguish "dogs allowed up to 40 lbs" from "cats only" — enables species-specific Heed's Take lines |
| `epctex~apartments-scraper-api` (current) | `petFriendly: boolean` + `petPolicy: string` — binary + text | **Moderately.** Binary field reliable. Text field parseable for more nuance. No per-species breakdown confirmed. |
| `memo23~apify-streeteasy-cheerio` | "Pet policies" and "Building policies" mentioned; **net-effective pricing** explicitly mentioned | **Plausibly yes.** StreetEasy shows per-species policy on listings. Net-effective pricing is an NYC-unique field that improves incentive detection (currently done via fragile regex). Unconfirmed field names. |
| `silentflow~realtor-rental-scraper` | "Allowed pets, deposits, fees, policy text" claimed — most specific language | **Possibly yes, if confirmed.** But 2 total users makes this speculation. |
| `parseforge~zillow-rentals-scraper` | "pet policy text" — likely free text | **Weakly.** Text-only = requires parsing. Same as current fallback. |
| `sovereigntaylor~zillow-rentals-scraper` | "pet policy text" | **Weakly.** Same as above plus 79% reliability. |
| `epctex~trulia-scraper` | Not mentioned in description | **Unknown, likely text-only if available.** |

**Pet field conclusion:** The non-API apartments scraper has the best-confirmed pet policy structure for future Heed's Take logic. The StreetEasy option has the best overall rental-field set (including net-effective rent), but field names are unconfirmed. Pet fields did not change the ranking — the top two candidates win on image quality and NYC coverage before pet fields even matter.

---

## Disqualification Flags

| Candidate | Disqualifying condition? |
|---|---|
| `sovereigntaylor~zillow-rentals-scraper` | Yes — 79% success rate at daily unattended runs is unacceptable |
| `silentflow~realtor-rental-scraper` | Near-disqualified — 2 total users, 0 reviews, no production evidence |
| `silentflow~trulia-rental-scraper` | Disqualified — insufficient data |

---

## What Is Still Unconfirmed Across All Candidates

The following questions cannot be answered without a live spike:

1. **Does `epctex~apartments-scraper` (non-API) return interior room photos vs. floor plans vs. community area photos in `photos[]`?** The field exists and is confirmed. The content of those URLs is not.

2. **What are the exact field names in `memo23~apify-streeteasy-cheerio` output?** Rating, success rate, and NYC relevance are confirmed. Schema details require a live run.

3. **How does `memo23~apify-streeteasy-cheerio` handle the borough field?** Does it return "Brooklyn" directly, or does it require the same city-name derivation the current normalizer uses?

4. **What is the gallery coverage rate (% of listings with at least 1 photo) for each unconfirmed candidate?**

5. **What does Zillow's `parseforge` actor return for neighborhood and borough in NYC listings?** GPS coordinates are confirmed but named location fields are not.

# LISTING API SELECTION CHECKLIST

Date: 2026-03-25
Companion to: `LISTING_API_REQUIREMENTS_REPORT.md`

This checklist is designed to evaluate any listing API or scraper candidate against the actual requirements of this codebase. Score each criterion for the candidate. The weighted total determines fit.

---

## How to Use This Checklist

For each criterion, assign a score from **0 to the listed max weight**.
Use the scoring guidance as a reference, not a formula.
Sum all scores. Use the total to compare candidates head-to-head.

**Max possible score: 100**

---

## Weighted Criteria

---

### 1. Image Quality — 25 pts

The dominant visual element of the product. A bad image here is visible to every user on every listing.

**What counts:**
- Does the provider return real interior photos (living room, bedroom, kitchen)?
- Is the primary image URL reliably a room photo, not a floor plan or building exterior?
- Is coverage consistent (90%+ of items have at least one usable photo)?
- Can floor plans be structurally separated from room photos (not mixed in the same array)?

**Scoring guidance:**

| Score | Description |
|---|---|
| 23–25 | Explicit photo array, separated from floor plans. 90%+ items have real interior photo. Photo is a deep-linked CDN URL, not behind auth. |
| 16–22 | Real photos present, mixed or partially present. 60–89% coverage. No explicit floor-plan separation. |
| 8–15 | Photos sometimes present but unreliable. Floor plans appear as primary image. Coverage < 60%. |
| 1–7 | Building exteriors, thumbnails, or property-manager stock images only. |
| 0 | No image field, always null, or always floor plan. |

**Notes:** This is the active production failure. The current actor (`epctex~apartments-scraper-api`) scores approximately 8–10 with `includeVisuals: false` and an unknown score with it enabled.

---

### 2. NYC Coverage — 20 pts

The app is NYC-only. The DB schema hard-rejects non-NYC boroughs.

**What counts:**
- Does the provider return listings for all 5 NYC boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island)?
- Are listings rental-specific (not for-sale mixed in)?
- Is the inventory representative of what NYC renters actually search (not just large managed buildings)?
- Are neighborhood names consistent with how NYC renters recognize them (Williamsburg, not "NW Brooklyn")?

**Scoring guidance:**

| Score | Description |
|---|---|
| 18–20 | NYC-native marketplace. All 5 boroughs covered. Rentals only, no for-sale contamination. Neighborhood names match NYC conventions. Unit-level listings, not building-only. |
| 13–17 | Strong NYC coverage. Some for-sale contamination or missing boroughs. Neighborhoods mostly correct. |
| 7–12 | National aggregator with NYC data. Noisy. Some boroughs underrepresented. Neighborhood names inconsistent. |
| 1–6 | NYC present but not a focus. Poor borough distribution. Requires heavy filtering. |
| 0 | No meaningful NYC rental coverage. |

**Notes:** StreetEasy is the only NYC-native rental marketplace. All other candidates are national aggregators with NYC data.

---

### 3. Schema Compatibility — 15 pts

Switching providers requires rebuilding the normalizer. The DB schema has hard constraints.

**What counts:**
- Are the required fields (price, bedrooms, bathrooms, borough/neighborhood, URL, image, pets) present and structured?
- Is borough derivable from the provider's location data without bespoke city-name mapping?
- Is the listing URL a stable, direct deep-link to a unit-level listing page?
- Is the image URL a direct CDN link (no redirect, no auth, no session)?
- Is pet policy returned as a discrete field, not buried in free text?
- Is price returned as monthly rent in USD (not sale price, not annual)?

**Scoring guidance:**

| Score | Description |
|---|---|
| 13–15 | All required fields present, typed, consistently structured. Borough maps cleanly to NYC names. No bespoke derivation needed. URL is a stable direct deep-link. |
| 9–12 | Most required fields present. Some derivation needed (e.g., city → borough). Price and URL are clean. |
| 5–8 | Required fields present but inconsistently structured. Pet policy buried in text. Neighborhood requires mapping. |
| 1–4 | Missing 1–2 required fields. Heavy normalization required. |
| 0 | Missing core fields (price, URL, borough) or they are unreliable. |

---

### 4. Stability — 15 pts

Daily unattended runs. No on-call monitoring. A broken actor = no listings = empty product.

**What counts:**
- Marketplace maturity: rating, user count, monthly active users (MAU)
- How recently the actor was updated (recent updates can signal active maintenance or schema churn)
- How recently the underlying site changed (apartments.com, streeteasy, zillow all change anti-bot behavior)
- Whether the actor's output schema has documented stability guarantees
- How many total users rely on it (higher = more incentive for maintainer to keep it working)

**Scoring guidance:**

| Score | Description |
|---|---|
| 13–15 | 4.5–5.0 rating, 50+ total users, 20+ MAU, last updated within 2 weeks, no known schema churn. |
| 9–12 | 4.0–5.0 rating, 20–49 total users, 10–19 MAU. Reasonably maintained. |
| 5–8 | Good rating but low user base (< 20 total), or recently updated in ways that changed schema. |
| 1–4 | Low rating or very low MAU (< 5). Uncertain maintenance. |
| 0 | 0 ratings, < 5 users, or clearly abandoned. |

**Notes:** Low MAU actors carry significant abandonment risk. If the maintainer stops updating, the actor breaks silently when the target site changes its HTML.

---

### 5. Cost — 10 pts

Running daily at 300 items. Budget tolerance is unknown but must be reasonable for a pre-revenue MVP.

**What counts:**
- Cost per 1,000 items scraped
- Whether image fetching adds a material surcharge
- Flat monthly fee (if any) on top of usage
- Whether costs scale predictably (pay-per-event vs. compute-unit)

**Scoring guidance:**

| Score | Description |
|---|---|
| 9–10 | < $30/month at 300 items/day with images. Predictable pricing. No hidden surcharges. |
| 6–8 | $30–75/month. Some usage surcharge for visuals. Still affordable for MVP. |
| 3–5 | $75–150/month. Usage-dependent. Marginal for MVP stage. |
| 1–2 | > $150/month or unpredictable cost structure. |
| 0 | Cost is prohibitive or pricing is opaque. |

**Notes:** Current actor with `includeVisuals: false` appears to cost < $1/run. Enabling visuals added ~$0.033 per 10 items in the spike. A flat $25/month subscription actor may be cheaper than pay-per-event at scale. Evaluate total cost of ownership, not just per-item rate.

---

### 6. Implementation Effort — 8 pts

How much code needs to change to ship a working integration.

**What counts:**
- Does the output schema match `DbRow` closely (address, borough, neighborhood, price, bedrooms, bathrooms, image_url, original_url, pets, status)?
- How much of `lib/apify-normalize.ts` can be reused?
- Does borough derivation require a new mapping layer?
- Does the actor use the same Apify REST API pattern (compatible with current sync/collect routes)?

**Scoring guidance:**

| Score | Description |
|---|---|
| 7–8 | Uses same Apify API. Output maps cleanly to existing DbRow with minimal changes to normalizer. Borough derivable without new mapping. |
| 5–6 | Same Apify API. Normalizer needs significant rework but core sync/collect routes reusable. |
| 3–4 | Different API or fundamentally different schema. New normalizer needed. Sync/collect routes need changes. |
| 1–2 | Different API, different auth, complex schema. Full integration rewrite. |
| 0 | Not feasible without major architectural changes. |

---

### 7. External Listing URL Quality — 4 pts

Users are sent directly to `original_url` via `window.open()`. A bad URL is the last thing users see.

**What counts:**
- Is the URL a direct deep-link to the specific unit listing?
- Does the page load without a login wall or paywall?
- Is the listing page on a brand that NYC renters recognize and trust?
- Does the URL remain stable between sync runs?

**Scoring guidance:**

| Score | Description |
|---|---|
| 4 | Direct stable deep-link on a recognized NYC rental brand (StreetEasy, Zillow). Page loads without auth. |
| 3 | Recognized brand but URL may be a property-level page, not unit-level. |
| 2 | National aggregator. Listing page loads but brand is unfamiliar to most NYC renters. |
| 1 | Redirect or listing aggregator with low trust. |
| 0 | URL behind login, broken, or not a listing page. |

---

### 8. Rental-Field Completeness — 3 pts

NYC-specific rental fields that have documented value in the product.

**What counts:**
- `pets` — returned as a discrete field (not buried in text)?
- `no_fee` / broker fee — available as a discrete field?
- `concessions` / free months — available as a discrete field or reliable description mention?

**Scoring guidance:**

| Score | Description |
|---|---|
| 3 | Pets returned discretely. Broker fee and/or concessions available as structured fields. |
| 2 | Pets returned discretely. Fee/concession data available only in description text. |
| 1 | Pet policy in description text only. No fee/concession data. |
| 0 | No rental-specific fields at all. |

---

## Scoring Sheet

Copy this table for each candidate being evaluated:

```
Provider: ___________________________________
Evaluated: ___________________________________

Criterion                      Max    Score   Notes
-----------------------------  -----  ------  -------
1. Image quality               25     ___
2. NYC coverage                20     ___
3. Schema compatibility        15     ___
4. Stability                   15     ___
5. Cost                        10     ___
6. Implementation effort        8     ___
7. External listing URL         4     ___
8. Rental-field completeness    3     ___

TOTAL                         100     ___
```

---

## Disqualifying Conditions

A candidate should be disqualified regardless of total score if any of the following apply:

- **No usable image** at all (score of 0 in criterion 1). The product cannot function.
- **No NYC rental coverage** (score of 0 in criterion 2). Hard DB constraint will reject all listings.
- **No stable listing URL** (score of 0 in criterion 7). Core CTA breaks.
- **Cost > $200/month** at current volume. Not sustainable pre-revenue.
- **0 Apify marketplace ratings AND < 10 total users**. Abandonment risk is too high for unattended daily runs.

---

## Decision Gate: What Must Be Proven Before Choosing

Before using this checklist to select a provider, confirm the following:

1. Run a 10-item live spike on each candidate. Do not rely on actor documentation alone for image quality or field coverage.
2. Inspect at least 5 returned image URLs visually. Confirm they are interior room photos, not floor plans, exteriors, or stock images.
3. Confirm the listing URL loads on mobile without a login wall.
4. Confirm price is monthly rent in USD, not annual or sale price.
5. Confirm borough names or source location fields can be cleanly mapped to the 5 valid NYC boroughs.
6. Confirm cost at 300 items/day with images enabled (not 10-item spike rate extrapolated).

Only after these 6 points are confirmed for each candidate should the scoring checklist be the deciding instrument.

# LISTING API REQUIREMENTS REPORT

Date: 2026-03-25
Based on: full codebase inspection of `app/decision/DecisionClient.tsx`, `components/DecisionListingCard.tsx`, `lib/apify-normalize.ts`, `app/api/apify/sync/route.ts`, `app/api/apify/collect/route.ts`, `app/api/cron/cleanup/route.ts`, `vercel.json`, `scripts/migration-fresh-start.sql`, `SCRAPER_VISUALS_SPIKE_REPORT.md`, `SCRAPER_OPTIONS_REPORT.md`

---

## 1. Minimum Listing Fields the App Needs Today

### Required for functionality (hard failures without them)

| Field | Why hard |
|---|---|
| `original_url` | Hard-rejected by normalizer if missing. Required for deduplication (upsert ON CONFLICT). Required for "See listing" CTA. Listings without it are filtered out before scoring. |
| `price` | Hard-rejected by normalizer if `<= 0`. Drives the entire budget-match scoring (30 pts). Displayed as price badge on card. |
| `bedrooms` | Defaults to `0` (studio) if missing — a silent lie. Core filter in all three passes. Drives 20-pt score component. |
| `borough` | Hard-rejected if not a valid NYC borough. Drives the 40-pt score component, the strict/relaxed filter, the borough alias system. |
| `status` | Must equal `'Active'` to appear in Supabase query (`.eq('status', 'Active')`). |

### Important for UX (degraded experience without them)

| Field | Current behavior if missing |
|---|---|
| `image_url` | Falls through to "Photos unavailable" placeholder UI. More critically: listing is rejected by `isPlaceholder()` check in all passes except the last-resort Pass 3. In practice, listings without a valid image rarely reach the user. |
| `neighborhood` | Falls back to `borough` value throughout UI: card title, Heed's Take, storage affiliate tile, borough label. Produces generic display ("Brooklyn" instead of "Williamsburg"). |
| `pets` | Defaults to `'Unknown'`. Affects 5-pt score component. "Unknown" is neither penalized nor rewarded. The card shows no pet tag at all, which is worse UX than a confirmed answer. |
| `description` | No incentive detection (2-pt bonus lost). No isRental keyword check. Card renders nothing in the description preview area. Heed's Take loses its incentive line. |
| `bathrooms` | Defaults to `1`. Drives a 3-pt score component. Low stakes but silently wrong if 0 is the real answer. |
| `address` | Stored in DB and hard-rejected by normalizer if malformed, but NOT rendered in the card or Decision UI anywhere. Required for DB integrity only. |

### Desirable but not critical today

| Field | Notes |
|---|---|
| `amenities` | In the `Listing` type, in the Supabase `select('*')`. **Never rendered anywhere in the card UI.** Also never persisted to Supabase from Apify (explicitly stripped in collect route). Effectively unused in the current product. |
| `images[]` (gallery) | Array is in the `Listing` type and the card checks `listing.images?.[0]` as a fallback to `image_url`. But `images` is never written to Supabase from Apify (stripped in upsert). From DB, it will always be undefined. The gallery fallback only works in the mock or live-Apify-fallback path. |
| `sqft` | Not in schema, not used anywhere. |
| `latitude` / `longitude` | Not in schema, not used anywhere. |
| `lease_terms` | Not in schema, not used anywhere. |
| `broker` / `landlord` | Not in schema, not used anywhere. |
| `source` | Column exists in DB with default `null`. Used in manual seed data but never populated by Apify sync. Not consumed by any UI logic. |
| `freshness_score` | Column exists in DB. Never populated by Apify sync. Not consumed by any UI logic. |
| `vibe_keywords` | Column exists in DB. Only used in manually seeded data. Not consumed by any UI. |

---

## 2. Where Each Field Is Consumed

| Normalized field | File(s) | Used for |
|---|---|---|
| `id` | `DecisionClient.tsx`, `DecisionListingCard.tsx` | React key, decision state tracking (localStorage `pepe_decisions`), dedup set |
| `price` | `DecisionClient.tsx:135`, `DecisionListingCard.tsx:82` | Budget scoring (30 pts), card badge, Heed's Take budget delta, bullets |
| `bedrooms` | `DecisionClient.tsx:147`, `DecisionListingCard.tsx:97` | Bedroom scoring (20 pts), filter pass 1+2, card tag, Heed's Take |
| `bathrooms` | `DecisionClient.tsx:167`, `DecisionListingCard.tsx:319` | Bath scoring (3 pts), card display tag |
| `borough` | `DecisionClient.tsx:77`, `DecisionListingCard.tsx:69` | Borough scoring (40 pts), alias matching, transit note, storage tile label |
| `neighborhood` | `DecisionClient.tsx:80`, `DecisionListingCard.tsx:80` | Card title, Heed's Take intro, borough matching (alias fallback), area label |
| `image_url` | `DecisionClient.tsx:632`, `DecisionListingCard.tsx:194` | Primary image; if missing/invalid → "Photos unavailable" UI; listing filtered out in pass 1+2 |
| `images[]` | `DecisionListingCard.tsx:194` | Fallback if `image_url` is empty (only works in non-DB paths) |
| `pets` | `DecisionClient.tsx:157`, `DecisionListingCard.tsx:165` | Pet scoring (5 pts), card pet tag, Heed's Take pet line |
| `description` | `DecisionClient.tsx:112`, `DecisionListingCard.tsx:61` | Incentive detection (2 pts bonus), `isRental()` check, card preview, Heed's Take incentive line |
| `original_url` | `DecisionClient.tsx:693`, `DecisionClient.tsx:848` | Filter (listings without it are rejected), dedup by URL, CTA `window.open()` |
| `status` | `DecisionClient.tsx:629` | Supabase query filter `.eq('status', 'Active')` |
| `amenities` | `DecisionClient.tsx` Listing type only | Appears in type, never rendered |
| `address` | `apify-normalize.ts:159` | Normalizer validation only; not rendered in any UI |
| `updated_at` | `app/api/cron/cleanup/route.ts:36` | Expiration: listings older than 10 days → status `'Expired'` |

---

## 3. Normalized Payload Fields Actually Used in the Product

These are the fields that matter to the running product today:

**From the provider → normalizer → Supabase:**
- `price` (from `rent.min`)
- `borough` (derived from `location.city` + `location.state`)
- `neighborhood` (derived from `location.neighborhood` or `location.city`)
- `bedrooms` (from `beds`)
- `bathrooms` (from `baths`)
- `description` (from `description`)
- `image_url` (from `models[0].image` → `models[0].imageLarge` → `images[0]` → `imageUrl` → `thumbnailUrl` → `mainImage` → `heroImage`)
- `original_url` (from `url`)
- `pets` (from `petFriendly` boolean or `petPolicy` string)
- `address` (from `location.fullAddress`)
- `status` (always set to `'Active'`)

**Normalized but stripped before Supabase write (explicitly excluded in collect route):**
- `neighborhood` — stripped from upsert to protect curated data; backfilled as borough name if null
- `pets` — stripped from upsert for same reason
- `description` — stripped from upsert for same reason
- `amenities` — stripped
- `images[]` — stripped
- `id` — stripped (Supabase generates its own UUID)

**Result:** From Apify, the DB actually receives only: `address`, `borough`, `price`, `bedrooms`, `bathrooms`, `image_url`, `original_url`, `status`. Everything else is either curated manually or backfilled.

---

## 4. Fields Missing or Poor in the Current Provider

### Coverage problem

| Field | Problem |
|---|---|
| `image_url` | **Critical active failure.** The spike (`SCRAPER_VISUALS_SPIKE_REPORT.md`) showed `images[]` returning 0/10 items even with `includeVisuals: true`. Only `models[0].image` had any coverage (~6/10), and the normalizer already tries it first. 4/10 items had no usable photo at all. This is the top production gap. |
| `neighborhood` | `location.neighborhood` is often absent. Fallback to `location.city` can return price blobs, title blobs, or wrong values. The normalizer has guards but the fallback often resolves to the borough name itself. |
| `pets` | `petFriendly` and `petPolicy` appear inconsistently across Apartments.com listings. Unknown rate is high. |
| `description` | Present in many items, but quality varies. Some descriptions are marketing copy from property managers, not unit-level details. |

### Quality problem

| Field | Problem |
|---|---|
| `image_url` | When present via `models[0].image`, the visuals spike confirmed it can be a building thumbnail or exterior shot, not an interior photo. The normalizer comment acknowledges `models[0]` "skews toward floor plans" but the spike showed floor-plan classification at 0/10 — meaning the images are unclassified externals, not proper room photos. |
| `borough` | Borough derivation relies on city name matching. Queens has 40+ neighborhood aliases to maintain. Errors cause hard rejection. Non-NYC cities (Jersey City, etc.) require an explicit blocklist in `DecisionClient.tsx`. |
| `pets` | Parsed from free-text `petPolicy` strings. Normalization may produce false negatives. |

### Structure problem

| Field | Problem |
|---|---|
| `images[]` | Always empty array in current production. The field exists in the type but the actor is called with `includeVisuals: false`, and even with it enabled the spike returned 0 gallery images. The gallery fallback in the card is dead code for DB-sourced listings. |
| `amenities` | Structured as `Array<{ title: string; value: string[] }>` groups. Flattened to a string array. Never persisted to DB. Never rendered. Wasted normalization work. |
| `rent` | Returns `{ min, max }`. The app uses only `min`. No visibility into whether it's gross or net effective rent (important for NYC concession-heavy market). |

### Consistency problem

| Field | Problem |
|---|---|
| `location.city` | Used as neighborhood source but can contain: actual city names, neighborhood names, price blobs (filtered), long title strings (filtered), or the word "Queens" when Apartments.com lists an Astoria listing. The normalizer has guards but edge cases still produce `borough` as neighborhood fallback. |
| `pets` | Can be `petFriendly: true`, `petFriendly: false`, or a `petPolicy` string. All three formats need separate parsing paths. |
| `id` | `item.id` is sometimes present. When absent, the normalizer generates `apts-{random}`, breaking deduplication stability across runs for the same listing. |

---

## 5. Images — What the App Needs

### What the app minimally needs not to look amateur

One high-quality, real interior photograph per listing — specifically a living room, bedroom, or kitchen photo. Not a floor plan. Not a building exterior. Not a thumbnail of the property manager's stock image. The design system renders the image at `aspect-ratio: 4/3` as the dominant visual element of the card. A bad image here undermines the entire product.

### Is one good primary image enough?

Yes, for the current product. The card shows a single image. There is no gallery, no swipe, no lightbox. A single reliable interior photo is the entire image requirement today.

### Is a gallery truly necessary today?

No. The `images[]` array field exists in types and the card checks it as a fallback, but no gallery UI exists. A provider delivering a gallery when the app only renders one image does not add user value. It adds ingestion complexity and payload cost.

### Do floor plans as the primary image damage user trust?

Yes, materially. The card renders the image at the top, large, as the emotional hook of the listing. A floor plan where a living room photo should be communicates that the product is scraping low-quality data. Users in NYC apartment search have high visual expectations from StreetEasy and Zillow.

### What currently happens in the UI when no image is available

The `DecisionListingCard` renders a styled "Photos unavailable" placeholder:
- Navy gradient background
- House icon
- Text: "Photos unavailable for this listing. Tap See listing details to view photos and more information."

This is an acceptable emergency fallback but is not a real listing experience. More critically, the filter chain (`isPlaceholder()`) rejects listings with missing or invalid images in pass 1 and pass 2, so they only appear in the last-resort pass 3. In practice, a listing with no image is the last thing shown, not the first.

The Supabase query also pre-filters: `.neq('image_url', '')` — so listings synced from Apify with no image are excluded from the result set entirely.

---

## 6. NYC-First: How That Changes Source Requirements

### Does the app need strong NYC coverage?

Yes, hard requirement. The borough CHECK constraint in the DB enforces it at the schema level. The normalizer rejects any listing that does not resolve to one of Manhattan, Brooklyn, Queens, Bronx, Staten Island. Non-NYC locations (Jersey City, Hoboken, Yonkers, etc.) are explicitly blocked by a `NON_NYC_LOCATIONS` set in the client. The quiz only asks about NYC boroughs.

### Does it need StreetEasy specifically?

Not strictly — but StreetEasy has structural advantages for this product:
- It is the dominant marketplace for NYC rentals, so inventory reflects what actual NYC renters see
- Listings on StreetEasy tend to be unit-level (not building-level as on Apartments.com)
- It separates photos from floor plans explicitly in its data structure
- Neighborhood names on StreetEasy match what NYC renters actually use

No other source provides the same combination of NYC-native inventory, rental focus, and neighborhood accuracy. Apartments.com and Zillow cover NYC but with national-aggregator noise and building-level listing structure.

### Borough/neighborhood quality

Critical. The 40-point scoring component depends entirely on borough and neighborhood accuracy. The current system maintains a manually curated alias map for ~60 neighborhoods per borough. A source that returns `city: "Astoria"` forces the system to infer Queens. A source that returns `neighborhood: "Williamsburg, Brooklyn"` breaks parsing. The app needs clean, consistent borough + neighborhood strings — ideally matching standard NYC naming conventions.

### Rental-specific fields important for NYC

| Field | Why it matters for NYC |
|---|---|
| `pets` | NYC renters with pets face significant filtering. Many buildings in Manhattan and Brooklyn are no-pets. Accurate pet policy is a meaningful differentiator. |
| `no_fee` / broker fee | NYC is the only US market where broker fees are a first-class concern. Not currently tracked in schema. High value if available. |
| `concessions` / net effective vs gross | NYC landlords routinely offer 1–2 months free on 12-month leases. The app detects this via description keyword matching, which is fragile. A structured field would be more reliable. |
| `lease_term` | NYC leases are typically 12 months but some buildings offer flexibility. Not tracked, not critical today. |
| `income_requirement` | NYC landlords typically require 40-45x monthly rent in annual income. Not tracked. Not critical today but relevant to the guarantor affiliate tile. |

---

## 7. Listing Metadata Importance Evaluation

| Field | Importance | Reason |
|---|---|---|
| `price` | Critical | Budget scoring (30 pts), primary filter, card display |
| `bedrooms` | Critical | Bedroom filter pass 1+2, scoring (20 pts) |
| `borough` | Critical | Location scoring (40 pts), hard filter, schema constraint |
| `original_url` | Critical | CTA, dedup key, filter gate |
| `image_url` | Critical (active failure) | Primary visual; drives filter exclusion; absent = invisible or degraded listing |
| `neighborhood` | High | Card title, Heed's Take, borough alias matching |
| `pets` | High for segment | 5-pt score, card tag, NYC renter filter |
| `description` | High | Incentive detection, isRental check, Heed's Take, card preview |
| `bathrooms` | Medium | 3-pt score, card display |
| `address` | Medium | DB integrity, normalizer validation; never displayed |
| `title` / `propertyName` | Low | Not in DB schema, not in Listing type, not rendered |
| `latitude` / `longitude` | Not used | Not in schema, not used anywhere |
| `sqft` | Not used | Not in schema |
| `amenities` | Not used today | In type, never persisted, never rendered |
| `lease terms` | Not used | Not in schema |
| `broker/landlord` | Not used | Not in schema |
| `source` | Low | Column exists, never populated by Apify, not consumed by UI |
| `updatedAt` / freshness | Low-medium | `updated_at` drives 10-day expiration cron. `freshness_score` exists but is never populated or consumed. |
| `images[]` (gallery) | Low today | Fallback only; never written to DB; no gallery UI exists |

---

## 8. Real-Time Scraping vs. Recurring Sync vs. Batch Ingestion

### How the current sync works

The system uses **asynchronous two-phase batch ingestion** on a daily Vercel cron:

1. `0 6 * * *` — `/api/apify/sync` fires. Starts an Apify actor run, stores the `run_id` in `sync_runs`, returns immediately.
2. `10 6 * * *` — `/api/apify/collect` fires. Reads the latest pending `sync_run`, checks Apify run status (single check, no retry loop), fetches results if SUCCEEDED, normalizes, upserts to Supabase.
3. `0 0 * * *` — `/api/cron/cleanup` fires. Marks listings with `updated_at < 10 days ago` as `'Expired'`.

On the client side:
- Primary data source is **Supabase** (instant, cached from last sync)
- Apify is a **live fallback** only if Supabase returns 0 listings
- Mock data is a **last-resort fallback** if both sources are empty

### Does the system need polling?

No real-time polling. The 10-minute gap between sync and collect is a fixed delay, not a poll loop. The collect endpoint makes a single status check — if the run is still RUNNING, it returns `{ status: 'pending' }` and waits for the next invocation (which doesn't exist automatically — this is a gap in the current implementation).

### Does it need deduplication?

Yes. Deduplication is implemented via `original_url` as the Supabase upsert conflict key. The collect route also deduplicates in memory before upsert with a `seenUrls` Set. The client deduplicates by `id` and `original_url` after fetch.

### Does it need a stable listing ID?

Yes, but the current implementation is fragile here. The normalizer uses `item.id` if present; otherwise generates `apts-{Math.random()}`. This means:
- If the provider returns an unstable or absent `id`, the same listing gets a new random UUID on every sync run
- Supabase deduplication still works (via `original_url`)
- But client-side decision tracking (`pepe_decisions`) is keyed on the Supabase UUID, which IS stable once written

### Does it need to detect listing updates/removals?

Partially. Removals are detected indirectly via the 10-day expiry cron (if a listing stops appearing in sync runs, it ages out). Updates are handled via upsert — but the collect route intentionally strips `neighborhood`, `pets`, and `description` to protect manually curated values, meaning those fields are **never updated** by subsequent syncs even if the source changes them.

There is no mechanism to detect that a listing was rented, taken down, or price-changed between sync runs.

---

## 9. System Tolerance for Missing Data

| Missing data | Tolerance | What happens |
|---|---|---|
| No image | **Low** | Normalizer allows it. Supabase query pre-filters `.neq('image_url', '')`. Pass 1+2 `isPlaceholder()` rejects it. Only visible in last-resort Pass 3 with "Photos unavailable" UI. Listing is effectively invisible to most users. |
| No neighborhood | **High** | Falls back to borough name throughout. Bad UX (generic label) but no failure. |
| No bedrooms | **Very low** | Defaults to `0` (studio). This is a silent wrong answer for non-studio listings. Wrong bedroom count causes filter rejection or wrong score. |
| No bathrooms | **Medium** | Defaults to `1`. 3-pt scoring impact. Not filtered. |
| No price | **Zero** | Hard-rejected by normalizer (`price <= 0` → `return null`). |
| No original_url | **Zero** | Hard-rejected by normalizer. Also filtered by client pass 1+2. |
| No borough | **Zero** | Hard-rejected by normalizer (must be valid NYC borough string). |
| No address | **Zero** | Hard-rejected by normalizer (null/missing/price-blob address → `return null`). |
| No description | **Medium** | Incentive detection fails (silent). isRental check falls back gracefully. Card shows no description preview. |
| No pets | **Medium** | Defaults to `'Unknown'`. Gets 2 pts (neutral) instead of 5 (match) or 0 (no match). No pet tag on card. |
| No lat/lng | **Full** | Not used. Zero impact. |

---

## 10. Database/Schema Dependencies That Limit Switching Providers

### Current active columns (from `migration-fresh-start.sql` + upsert behavior)

| Column | Type | Constraint | Populated from Apify? |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | No (DB generates) |
| `address` | TEXT | NOT NULL | Yes |
| `borough` | TEXT | NOT NULL, CHECK (5 values) | Yes |
| `neighborhood` | TEXT | nullable | No (backfilled as borough) |
| `price` | NUMERIC | NOT NULL, > 0 | Yes |
| `bedrooms` | NUMERIC | NOT NULL | Yes |
| `bathrooms` | NUMERIC | NOT NULL | Yes |
| `pets` | TEXT | CHECK (6 specific values) | No (stripped from upsert) |
| `image_url` | TEXT | nullable | Yes |
| `original_url` | TEXT | nullable, dedup key | Yes |
| `description` | TEXT | nullable | No (stripped from upsert) |
| `status` | TEXT | CHECK (Active/Inactive/Rented) | Yes (always 'Active') |
| `source` | TEXT | nullable | No |
| `freshness_score` | INTEGER | nullable | No |
| `vibe_keywords` | TEXT[] | nullable | No |
| `last_checked` | TIMESTAMPTZ | nullable | No |
| `scraped_at` | TIMESTAMPTZ | nullable | No |
| `updated_at` | TIMESTAMPTZ | nullable | No (auto-updated on upsert) |
| `created_at` | TIMESTAMPTZ | nullable | No (auto) |

### Migration risks when switching provider

**Hard constraints:**

1. `borough` CHECK — any new provider must map to exactly `'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'`. Non-NYC sources or different naming conventions will produce mass normalizer rejections.
2. `pets` CHECK — if any future upsert includes pets, values must match the exact allowed set. Currently not a risk since pets is stripped.
3. `original_url` conflict key — the dedup key is the listing URL. Different providers will produce completely different URLs for the same physical apartment, causing duplicates across providers if you ever mix sources.

**Normalization effort:**

The entire `lib/apify-normalize.ts` is Apartments.com-shaped:
- `ApartmentsItem` type mirrors Apartments.com Apify actor output
- Borough detection logic (`detectBorough`, `QUEENS_CITIES`) is built around how Apartments.com names NYC cities
- Pet parsing handles `petFriendly: boolean` and `petPolicy: string` — Apartments.com-specific field names
- Image candidate chain mirrors the specific nested `models[0]` structure

Any new provider requires a parallel or replacement normalizer. The Supabase schema and `DbRow` type are provider-agnostic, but the mapping layer is not.

**Required normalization for any new provider:**
- Borough derivation (must produce one of the 5 valid strings)
- Neighborhood extraction (must not produce price blobs or title blobs)
- Price as a number (must be monthly rent, not sale price or annual)
- Pet policy as a binary/ternary value
- A reliable listing URL as dedup key
- Valid image URL (must start with `https://` and not be a known placeholder)

---

## 11. Operational Requirements the New API Must Meet

| Requirement | Current behavior | What matters |
|---|---|---|
| **Stability** | `epctex~apartments-scraper-api` — 5.0 rating, 99 total users, 36 monthly active, last modified 4 days ago. Medium-high stability. | Must survive unattended daily runs. Any actor that frequently fails or changes output schema silently breaks ingestion without alerts. |
| **Cost per volume** | Current run: 300 items, ~$0.033 per 10-item spike. Full 300-item run with `includeVisuals: false` is estimated cheap. Enabling visuals materially increases cost (unconfirmed rate). | Cost must be acceptable at 300 items/day. At ~$0.033 per 10 items, 300 items = ~$1/run if linear. Daily = ~$30/month at that rate. Visuals surcharge unknown. |
| **Request/run limits** | Vercel cron runs once daily. Collect has `maxDuration: 60` seconds. | Actor must complete in under 10 minutes for the 10-minute gap to work. 300 items must fit in one run. Pagination/multi-run strategies require code changes. |
| **Speed** | 10-item spike completed in 35 seconds. 300-item run: unconfirmed. | Slow actors (>10 min) break the current two-phase cron. Either tighter timing or a polling/retry mechanism is needed. |
| **Payload predictability** | Apartments.com actor has a documented input schema. Fields vary per item. | Schema must be stable. Undocumented fields used in production (`models[0]`) are a known fragility. |
| **Breakage risk** | `includeVisuals: false` appears stable. Enabling visuals changed payload shape. Apify actors can change output without versioning. | Low-usage actors (< 10 monthly active) have higher abandonment risk. |
| **Ease of normalization** | Medium. Borough derivation is bespoke. Queens city-name mapping is a maintenance burden. | New provider normalization cost is medium-high regardless of source due to borough constraint. |
| **NYC coverage** | Apartments.com scraper covers all 5 boroughs via explicit startUrls. Actual rental inventory on Apartments.com is biased toward larger managed buildings. | Must cover all 5 boroughs. Must return rentals, not for-sale listings. |
| **Image quality** | Active failure. 40% of items have no usable image even with visuals enabled. Those that have one may be building exteriors. | Single high-quality interior photo per listing is the baseline. Floor plans as primary image are product-damaging. |
| **Listing URL quality** | Apartments.com URLs are stable, clean, deep-links to individual listings. | Users are sent directly to the listing via `window.open(original_url)`. A bad URL (aggregator redirect, broken deep-link, listing page behind login wall) breaks the core CTA. |

---

## 12. Missing Critical Information Before Choosing a Provider

The following gaps must be resolved before a confident provider decision:

1. **Image coverage at scale with visuals enabled.** The spike ran 10 items and found 6/10 with a usable photo, 4/10 with nothing. A 300-item run is needed to confirm the real coverage rate and the incremental cost. This is the highest-priority open question.

2. **What `models[0].image` actually shows.** The spike flagged it as "photo-like" but did not confirm it is an interior room photo vs. a building exterior. Visual inspection of the actual URLs from the spike is needed.

3. **StreetEasy actor real output.** `memo23/apify-streeteasy-cheerio` has 8 monthly active users. Its schema has been reviewed in `SCRAPER_OPTIONS_REPORT.md` based on documentation, not a live test. A 10-item spike is needed to confirm field availability, image quality, neighborhood naming conventions, and URL structure before it can be ranked as a definitive replacement.

4. **Cost with `includeVisuals: true` at 300 items.** The current spike cost $0.033 for 10 items with visuals enabled. If this scales linearly to $1/run ($30/month), that may be acceptable. If visuals adds a fixed surcharge per item it could be significantly higher. This needs to be confirmed before committing to the visuals path on the current actor.

5. **Whether the current actor returns rental-only listings.** The `isRental()` client-side check exists precisely because the current source mixes in non-rental or ambiguous items. The rate of non-rental contamination at scale is unknown.

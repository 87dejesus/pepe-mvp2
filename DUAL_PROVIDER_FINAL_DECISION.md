# DUAL_PROVIDER_FINAL_DECISION

Date: 2026-03-26
Companion: `DUAL_PROVIDER_SPIKE_COMPARISON.md`
Supersedes: prior draft based on projected epctex data

---

## Decision

**Winner (target for migration): `memo23~apify-streeteasy-cheerio`**

**Runner-up: None.** The epctex family is eliminated. No other candidate is validated.

**Current status: Do not migrate yet.** StreetEasy has a blocking issue that must be resolved before migration can begin.

---

## What the Spikes Actually Found

### epctex~apartments-scraper (non-API) — DEAD

Revalidated on 2026-03-25 with live run `jjZumqCfnl8qhcqzJ`. Result: 0 items.

The run completed successfully but returned an empty dataset (`[]`). That alone disqualifies it as an immediate replacement, because the current app requires listings with price, borough, address, and URL before image quality is even evaluated.

Earlier validation also captured the actor's startup log line:

> *"Due to new security protections on Apartments.com, this is the only working solution"* — linking to the API version.

The browser scraper is deprecated by its own developer. The `photos[]` array documented in the GitHub README exists in the schema of a dead actor. There is no epctex path to solving the image problem:
- The API version (current production) has confirmed image failure
- The browser version cannot scrape Apartments.com at all

The entire epctex family is a dead end for image quality.

### memo23~apify-streeteasy-cheerio — DATA GOOD, PHOTOS BLOCKED

Rented and run. 10 items, 8 seconds, all 5 boroughs, 15–42 photos per listing. Then:

Every CDN URL pattern constructed from the photo keys returns `301 → streeteasy.com homepage` or `403 AccessDenied` (private S3 bucket) or an SVG placeholder. There is no pattern that yields a publicly accessible photo URL from these keys. `image_url` would be null for all listings if migrated today.

---

## Why StreetEasy Is Still the Winner

Despite the photo blocker, StreetEasy is the target because it is the only candidate that:

1. **Returns real data at all.** Every other evaluated actor is either dead (epctex non-API), has a confirmed worse image failure (epctex API), or is unvalidated and low-confidence (parseforge/zillow at 10 users, silentflow/realtor at 2 users).

2. **Has photos in its schema.** 10/10 items returned 15–42 photos. The data exists inside StreetEasy's CDN. The blocker is access, not existence.

3. **Has a single recoverable blocker.** The photo URL problem is one field away from being fixed: the actor needs to return `https://cdn-photos.streeteasy.com/nyc/photos/{key}.jpg` instead of `{key}`. That is a change on the actor developer's side, not ours.

4. **Every other dimension is better than the current provider:**
   - Neighborhood: real NYC names, no QUEENS_CITIES hack
   - Borough: derivable from `areaName` with a clean neighborhood→borough map
   - Price: integer field directly, no string parsing
   - Net-effective rent and months-free: structured fields — only provider that captures NYC concessions
   - URL: StreetEasy brand, highest trust with NYC renters
   - Volume: 15–42 photos per listing vs 0–1 on the current provider

---

## Why the Loser (epctex non-API) Should Not Be Chosen

It cannot be chosen. The actor is deprecated and returns no output. This is not a risk to be managed — it is a hard failure with zero path to resolution unless the developer revives it, which they have explicitly stated they will not do.

---

## Is StreetEasy Short-Term or Long-Term?

**Long-term** — if the photo URL blocker is resolved.

The reasons StreetEasy was the long-term target in `LISTING_API_FINAL_RECOMMENDATION.md` remain true and are now reinforced by live observed data:
- Unit-level listing data
- Real NYC neighborhood names natively
- Net-effective pricing and concession data as structured fields
- StreetEasy listing URLs (brand trust)
- 97% 30-day success rate

The original plan had StreetEasy as long-term because schema was unconfirmed. Schema is now confirmed. The only remaining unknown is the photo URL resolution.

---

## The Photo URL Problem: What to Do

This is the only thing blocking migration. Three paths:

**Path A — Contact the actor developer (highest-leverage, try first)**

Contact `memo23` on Apify and ask:

> "The `photos[].key` and `leadMedia.photo.key` fields in your actor output are CDN keys, not accessible URLs. Every URL pattern we tried (`cdn-photos.streeteasy.com/nyc/photos/{key}.jpg`, etc.) redirects to `streeteasy.com` or returns 403. We need the actor to return full CDN photo URLs for use as `image_url` in a third-party application. Can you add the constructed URL to the output, or clarify what URL format these keys should be used with?"

This is a one-message ask. If the developer responds with the correct URL format or adds URLs to the output, the migration can proceed immediately.

**Path B — Test CDN URL access from a real browser (not curl)**

The 301/403 responses were from server-side curl requests. A real browser making the request from our app may behave differently (cookies from a prior StreetEasy visit, different TLS fingerprint, etc.). This needs to be verified by:
1. Constructing a test URL: `https://cdn-photos.streeteasy.com/nyc/photos/a5b8c7ee4f1070f26b389d64c41ffb81.jpg`
2. Opening it directly in a browser and observing the result
3. Embedding it as `<img src="...">` in a local HTML file and checking if it renders

If it renders from a browser, the curl-level 301 is irrelevant — `<img>` tags in our app would work fine.

**Path C — Evaluate the next fallback provider**

If Paths A and B both fail, the next candidates from `LISTING_API_PROVIDER_COMPARISON.md` are:
- `parseforge~zillow-rentals-scraper` (10 users, 1 review, unvalidated)
- `silentflow~realtor-rental-scraper` (2 users, 0 reviews, not recommended)

Neither is high confidence. Path C is only relevant if StreetEasy is definitively blocked.

---

## Current Production: Do Not Change

Keep `epctex~apartments-scraper-api` running its daily cron. Do not change `APIFY_ACTOR_ID`. The fallback chain (Supabase cache → Apify live → mock) continues to protect users. The image problem persists but the product shows listings.

Do not touch the production cron until StreetEasy's photo URL status is confirmed.

---

## Exact Next Steps, In Order

### 1. Test photo URL in a real browser (5 minutes)

Open this URL directly in Chrome or Firefox:

```
https://cdn-photos.streeteasy.com/nyc/photos/a5b8c7ee4f1070f26b389d64c41ffb81.jpg
```

**If it loads as a real interior photo:** Path B confirmed. The curl blocking is irrelevant. Proceed to migration planning — the photo pipeline works. The normalizer needs to construct this URL from the key.

**If it redirects to streeteasy.com:** Path A (contact developer) becomes the priority.

### 2. If browser test passes — build the StreetEasy normalizer

The full normalizer rewrite is significant. All field paths change. Key mappings:

| Current (`ApartmentsItem`) | StreetEasy (`item.node.*`) |
|---|---|
| `item.rent.min` | `item.node.price` |
| `item.beds` (string) | `item.node.bedroomCount` (integer) |
| `item.baths` (string) | `item.node.fullBathroomCount` (integer) |
| `item.location.city` → BOROUGH_MAP | `item.node.areaName` → new neighborhood→borough map |
| `item.location.neighborhood` | `item.node.areaName` (this IS the neighborhood) |
| `item.location.fullAddress` | `item.node.street + ', Unit ' + item.node.unit` |
| `item.url` | `'https://streeteasy.com' + item.node.urlPath` |
| `item.photos?.[0]` (now dead) | `constructPhotoUrl(item.node.leadMedia.photo.key)` |
| `item.petFriendly` | Not in schema — remove or default to 'Unknown' |
| — | `item.node.netEffectivePrice` (new) |
| — | `item.node.monthsFree` (new) |
| — | `item.node.noFee` (new) |

New borough mapping needed (replaces QUEENS_CITIES):

```typescript
// A partial list — needs to cover all areaNames returned
const AREA_BOROUGH_MAP: Record<string, string> = {
  // Manhattan
  'inwood': 'Manhattan', 'washington heights': 'Manhattan', 'fort george': 'Manhattan',
  'harlem': 'Manhattan', 'east harlem': 'Manhattan', 'morningside heights': 'Manhattan',
  'upper west side': 'Manhattan', 'upper east side': 'Manhattan', 'lincoln square': 'Manhattan',
  'midtown': 'Manhattan', 'midtown east': 'Manhattan', 'midtown west': 'Manhattan',
  'hell\'s kitchen': 'Manhattan', 'chelsea': 'Manhattan', 'gramercy': 'Manhattan',
  'flatiron': 'Manhattan', 'east village': 'Manhattan', 'west village': 'Manhattan',
  'greenwich village': 'Manhattan', 'soho': 'Manhattan', 'nolita': 'Manhattan',
  'tribeca': 'Manhattan', 'financial district': 'Manhattan', 'battery park city': 'Manhattan',
  'lower east side': 'Manhattan', 'two bridges': 'Manhattan', 'sutton place': 'Manhattan',
  // Brooklyn
  'williamsburg': 'Brooklyn', 'greenpoint': 'Brooklyn', 'bushwick': 'Brooklyn',
  'bedford-stuyvesant': 'Brooklyn', 'crown heights': 'Brooklyn', 'prospect heights': 'Brooklyn',
  'park slope': 'Brooklyn', 'fort greene': 'Brooklyn', 'clinton hill': 'Brooklyn',
  'boerum hill': 'Brooklyn', 'cobble hill': 'Brooklyn', 'carroll gardens': 'Brooklyn',
  'red hook': 'Brooklyn', 'sunset park': 'Brooklyn', 'bay ridge': 'Brooklyn',
  'borough park': 'Brooklyn', 'flatbush': 'Brooklyn', 'midwood': 'Brooklyn',
  'bensonhurst': 'Brooklyn', 'coney island': 'Brooklyn', 'brighton beach': 'Brooklyn',
  'sheepshead bay': 'Brooklyn', 'marine park': 'Brooklyn', 'canarsie': 'Brooklyn',
  'east new york': 'Brooklyn', 'brownsville': 'Brooklyn', 'downtown brooklyn': 'Brooklyn',
  'dumbo': 'Brooklyn', 'vinegar hill': 'Brooklyn',
  // Queens
  'astoria': 'Queens', 'long island city': 'Queens', 'sunnyside': 'Queens',
  'woodside': 'Queens', 'jackson heights': 'Queens', 'elmhurst': 'Queens',
  'corona': 'Queens', 'flushing': 'Queens', 'forest hills': 'Queens',
  'rego park': 'Queens', 'kew gardens': 'Queens', 'richmond hill': 'Queens',
  'ozone park': 'Queens', 'howard beach': 'Queens', 'jamaica': 'Queens',
  'ridgewood': 'Queens', 'maspeth': 'Queens', 'middle village': 'Queens',
  'bayside': 'Queens', 'fresh meadows': 'Queens', 'glen oaks': 'Queens',
  'little neck': 'Queens', 'college point': 'Queens', 'whitestone': 'Queens',
  'far rockaway': 'Queens', 'rockaway park': 'Queens', 'arverne': 'Queens',
  // Bronx
  'mott haven': 'Bronx', 'port morris': 'Bronx', 'hunts point': 'Bronx',
  'longwood': 'Bronx', 'melrose': 'Bronx', 'morrisania': 'Bronx',
  'fordham': 'Bronx', 'tremont': 'Bronx', 'belmont': 'Bronx',
  'concourse': 'Bronx', 'highbridge': 'Bronx', 'kingsbridge': 'Bronx',
  'riverdale': 'Bronx', 'norwood': 'Bronx', 'bedford park': 'Bronx',
  'pelham bay': 'Bronx', 'city island': 'Bronx', 'co-op city': 'Bronx',
  // Staten Island
  'saint george': 'Staten Island', 'st. george': 'Staten Island',
  'tompkinsville': 'Staten Island', 'stapleton': 'Staten Island',
  'port richmond': 'Staten Island', 'west brighton': 'Staten Island',
  'new brighton': 'Staten Island', 'bulls head': 'Staten Island',
  'annadale': 'Staten Island', 'tottenville': 'Staten Island',
};
```

Photo URL construction (pending Path A/B confirmation):

```typescript
function constructStreetEasyPhotoUrl(key: string): string | null {
  if (!key) return null;
  return `https://cdn-photos.streeteasy.com/nyc/photos/${key}.jpg`;
}
```

New fields to add to DB schema (optional, for Heed's Take):

```sql
ALTER TABLE listings ADD COLUMN net_effective_price NUMERIC;
ALTER TABLE listings ADD COLUMN months_free NUMERIC;
ALTER TABLE listings ADD COLUMN no_fee BOOLEAN;
```

### 3. If browser test fails — contact memo23

Open the Apify console, find the actor `memo23/apify-streeteasy-cheerio`, and use the contact button to send the message from Path A above.

### 4. Do not cancel the StreetEasy subscription while waiting

The actor is already rented at $15/month. Keep it active. When the photo URL issue is resolved, the spike script (`scripts/streeteasy-spike.mjs`) is ready to re-run with zero changes.

---

## Decision Confidence

| Claim | Confidence | Evidence |
|---|---|---|
| epctex non-API is dead | **Confirmed** | Live run, 0 items, developer log message |
| StreetEasy photo keys are CDN keys, not URLs | **Confirmed** | Observed `{__typename, key}` in raw output |
| CDN URLs not accessible from server-side curl | **Confirmed** | 7 URL patterns tested, all 301/403 |
| CDN URLs accessible from browser `<img>` | **Unknown** | Not tested — this is Path B above |
| StreetEasy has no pet field | **Confirmed** | All 34 node keys enumerated, none pet-related |
| StreetEasy borough derivation from areaName | **Confirmed** | 10/10 correct with neighborhood→borough map |
| StreetEasy net-effective pricing works | **Confirmed** | `node.netEffectivePrice` and `node.monthsFree` present on 6/10 items |

---

## Final Summary

| | epctex non-API | StreetEasy |
|---|---|---|
| Run status | FAIL — 0 items, deprecated | RAN — 10 items |
| Image problem solved | NO — actor dead | **NOT YET — CDN blocked (may be resolvable)** |
| Neighborhood quality | N/A | Excellent — real NYC names |
| Concession data | N/A | Best of all candidates |
| Pet data | N/A | None — regression |
| Normalizer effort | N/A | Full rewrite |
| Migration risk | N/A — moot | Moderate — single CDN blocker |
| Verdict | **Eliminated** | **Target — pending photo URL resolution** |

**Immediate action:** Open `https://cdn-photos.streeteasy.com/nyc/photos/a5b8c7ee4f1070f26b389d64c41ffb81.jpg` in a browser. That result determines the next step.

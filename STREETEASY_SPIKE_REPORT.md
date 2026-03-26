# STREETEASY_SPIKE_REPORT

Date: 2026-03-26
Actor: `memo23~apify-streeteasy-cheerio`
Run ID: `3gY0cgSWcgDbDxsdY`
Items: 10
Run time: 8.076s
Cost: $0.0032886974920332433 USD
Raw payload: 26.8 KiB

---

## Test Scope

- Script: `scripts/streeteasy-spike.mjs`
- Production code modified: none
- Database modified: none
- Input:
```json
{
  "startUrls": [
    {
      "url": "https://streeteasy.com/for-rent/nyc"
    },
    {
      "url": "https://streeteasy.com/for-rent/brooklyn"
    },
    {
      "url": "https://streeteasy.com/for-rent/queens"
    }
  ],
  "maxItems": 10
}
```

---

## Schema Discovery

Top-level keys observed across all 10 items:
```
__typename, amenitiesMatch, matchedAmenities, missingAmenities, node
```

---

## Image Results

**Photo coverage:** 0%
**Image verdict:** POOR — 0/10 items have photo-like images. Does not solve image problem.
**Floor plan separation:** NOT CONFIRMED — floor plan separation not observed in this sample.

| Metric | Count | / Total |
|---|---|---|
| Items with any photos | 0 | 10 |
| Items with photo-like images | 0 | 10 |
| Items with separated floor plans | 0 | 10 |
| Avg photos per item | 0.0 | — |
| Items with no usable image | 10 | 10 |

---

## Location Results

**Borough verdict:** PARTIAL — only 0/10 items resolved to a valid NYC borough.
**Neighborhood:** 0/10 items have a real neighborhood (not just borough)

| Metric | Count | / Total |
|---|---|---|
| Items with valid NYC borough | 0 | 10 |
| Borough returned as direct field | 0 | 10 |
| Items with real neighborhood name | 0 | 10 |
| Items with geo coordinates | 0 | 10 |

---

## Core Field Results

| Metric | Count | / Total |
|---|---|---|
| Items with valid price | 0 | 10 |
| Items with net-effective rent | 0 | 10 |
| Items with bedrooms field | 0 | 10 |
| Items with bathrooms field | 0 | 10 |
| Items with sqft | 0 | 10 |

---

## URL Results

**URL verdict:** PARTIAL — only 0/10 URLs are on streeteasy.com.

| Metric | Count | / Total |
|---|---|---|
| Items with valid URL | 0 | 10 |
| URLs on streeteasy.com | 0 | 10 |
| Unit-level URLs | 0 | 10 |

---

## Pet Policy Results

| Metric | Count | / Total |
|---|---|---|
| Items with any pet data | 0 | 10 |
| Derived: Allowed | 0 | 10 |
| Derived: Not allowed | 0 | 10 |
| Derived: Unknown | 10 | 10 |

---

## NYC-Specific Strengths Observed

| Feature | Coverage |
|---|---|
| No-fee indicator | 10/10 |
| Concession / months-free | 0/10 |
| Net-effective rent | 0/10 |

---

## Normalizer Compatibility

Items that would pass current normalizer (price + URL + valid borough + address): **0/10**

**Changes required in `lib/apify-normalize.ts` to adopt this actor:**
- Update `ApartmentsItem` type to match StreetEasy schema (new field names for all fields)
- New image candidate: `item.media?.photos?.[0]` or `item.photos?.[0]` (confirm field name from schema discovery above)
- Borough: if returned as direct field, borough detection simplifies significantly — remove QUEENS_CITIES mapping
- Neighborhood: if returned as direct field, neighborhood is cleaner than city-derived fallback
- Price: update to use whichever field name was observed above
- Net-effective rent: new field, no existing normalizer support — add if desired
- Pet: update to use whichever field name was observed above
- URL: no change if field is still `url`

This is a **significant normalizer rewrite** — all field paths change. But the sync/collect route infrastructure is unchanged.

---

## Sample Items (first 5)

### Item 1
- **Photos:** 0 in none (0 photo-like)
  - Sample: none
- **Floor plans separated:** false (none, 0 items)
  - Sample floor plan: none
- **Borough:** none → derived: Unknown (valid: false, direct: null)
- **Neighborhood:** none (real: false)
- **Address:** none
- **Price:** $null/mo | Net effective: n/a
- **Beds/Baths:** 0br / 1ba | sqft: n/a
- **URL:** none (StreetEasy: null, unit-level: null)
- **Pet:** Unknown | raw: {}
- **Concessions:** noFee=false | concessions=n/a
- **Would pass normalizer:** false
- **All raw fields:** __typename, amenitiesMatch, matchedAmenities, missingAmenities, node

### Item 2
- **Photos:** 0 in none (0 photo-like)
  - Sample: none
- **Floor plans separated:** false (none, 0 items)
  - Sample floor plan: none
- **Borough:** none → derived: Unknown (valid: false, direct: null)
- **Neighborhood:** none (real: false)
- **Address:** none
- **Price:** $null/mo | Net effective: n/a
- **Beds/Baths:** 0br / 1ba | sqft: n/a
- **URL:** none (StreetEasy: null, unit-level: null)
- **Pet:** Unknown | raw: {}
- **Concessions:** noFee=false | concessions=n/a
- **Would pass normalizer:** false
- **All raw fields:** __typename, amenitiesMatch, matchedAmenities, missingAmenities, node

### Item 3
- **Photos:** 0 in none (0 photo-like)
  - Sample: none
- **Floor plans separated:** false (none, 0 items)
  - Sample floor plan: none
- **Borough:** none → derived: Unknown (valid: false, direct: null)
- **Neighborhood:** none (real: false)
- **Address:** none
- **Price:** $null/mo | Net effective: n/a
- **Beds/Baths:** 0br / 1ba | sqft: n/a
- **URL:** none (StreetEasy: null, unit-level: null)
- **Pet:** Unknown | raw: {}
- **Concessions:** noFee=false | concessions=n/a
- **Would pass normalizer:** false
- **All raw fields:** __typename, amenitiesMatch, matchedAmenities, missingAmenities, node

### Item 4
- **Photos:** 0 in none (0 photo-like)
  - Sample: none
- **Floor plans separated:** false (none, 0 items)
  - Sample floor plan: none
- **Borough:** none → derived: Unknown (valid: false, direct: null)
- **Neighborhood:** none (real: false)
- **Address:** none
- **Price:** $null/mo | Net effective: n/a
- **Beds/Baths:** 0br / 1ba | sqft: n/a
- **URL:** none (StreetEasy: null, unit-level: null)
- **Pet:** Unknown | raw: {}
- **Concessions:** noFee=false | concessions=n/a
- **Would pass normalizer:** false
- **All raw fields:** __typename, amenitiesMatch, matchedAmenities, missingAmenities, node

### Item 5
- **Photos:** 0 in none (0 photo-like)
  - Sample: none
- **Floor plans separated:** false (none, 0 items)
  - Sample floor plan: none
- **Borough:** none → derived: Unknown (valid: false, direct: null)
- **Neighborhood:** none (real: false)
- **Address:** none
- **Price:** $null/mo | Net effective: n/a
- **Beds/Baths:** 0br / 1ba | sqft: n/a
- **URL:** none (StreetEasy: null, unit-level: null)
- **Pet:** Unknown | raw: {}
- **Concessions:** noFee=false | concessions=n/a
- **Would pass normalizer:** false
- **All raw fields:** __typename, amenitiesMatch, matchedAmenities, missingAmenities, node

---

## Verdict

**FAIL** — critical criteria not met. Do not migrate to this actor.

### Is StreetEasy strong enough to be the immediate migration target?

NO — critical failures prevent immediate migration.

---

## Biggest Unknowns (entering this spike)

These were the unknown quantities before the run. Mark each as resolved or still unknown:

1. **Photo field name** — `media.photos[].url` vs `photos[]` vs other: UNRESOLVED — no photos found
2. **Floor plan separation** — photos and floor plans in separate arrays: NOT CONFIRMED in this sample
3. **Borough field** — direct field vs derived from city: DERIVED ONLY — city mapping still needed
4. **Neighborhood naming** — real NYC names vs codes/IDs: NOT CONFIRMED
5. **Net-effective rent** — available as distinct field: NOT PRESENT in this sample
6. **URL format** — unit-level StreetEasy deep link: NOT CONFIRMED

---

## Implementation Risk

- **Normalizer rewrite scope:** High — all field paths change. This is not an additive change.
- **Infrastructure risk:** Low — same Apify sync/collect pattern, only `APIFY_ACTOR_ID` changes.
- **Schema stability risk:** Moderate — actor has been updated 78 times in ~13 months and pricing changed 6 times. Schema may drift.
- **Data quality risk:** Low — StreetEasy is the authoritative NYC rental marketplace. If photos are present, they are listing-quality.

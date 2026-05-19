# EPCTEX_NON_API_SPIKE_REPORT

Date: 2026-03-25
Actor tested: `epctex~apartments-scraper` (non-API)
Script: `scripts/epctex-non-api-spike.mjs`

## Final Verdict

**FAIL**

The actor is not a viable immediate replacement. It is accessible and runnable, but the live validation run returned **0 items**, so it fails the app's minimum requirements before field quality can even be evaluated.

## Observed Run

- Run ID: `jjZumqCfnl8qhcqzJ`
- Status: `SUCCEEDED`
- Items returned: `0`
- Raw output file: `EPCTEX_NON_API_SPIKE_RAW.json`
- Raw output observed: `[]`

This is enough to fail the candidate. A provider that produces zero listings cannot replace the current provider.

## Repo / Spike Script Check

- Existing spike script confirmed: `scripts/epctex-non-api-spike.mjs`
- Scope confirmed: local-only spike, writes only report/raw artifacts
- Production code changed: none
- Script fixes required: none

The only runtime issue was network restriction in the local sandbox. The script itself ran cleanly once allowed to reach Apify.

## Validation Against Actual App Requirements

The current app normalizer in `lib/apify-normalize.ts` requires, per listing:

- item exists
- `rent.min > 0`
- borough derivable to one of: Manhattan, Brooklyn, Queens, Bronx, Staten Island
- non-empty `location.fullAddress`
- non-empty `url`
- image input preferred but optional

Observed result from this spike:

| Requirement | Observed result | Outcome |
|---|---|---|
| Listings returned at all | `0` items | **Fail** |
| Usable public photo URLs in `photos[]` | Not observable | **Fail for immediate use** |
| Photos are real interiors, not floor plans/placeholders | Not observable | **Fail for immediate use** |
| Borough quality | Not observable | **Fail for immediate use** |
| Neighborhood quality | Not observable | **Fail for immediate use** |
| Address quality | Not observable | **Fail for immediate use** |
| Original listing URL quality | Not observable | **Fail for immediate use** |
| Price coverage | Not observable | **Fail for immediate use** |
| Bedrooms coverage | Not observable | **Fail for immediate use** |
| Bathrooms coverage | Not observable | **Fail for immediate use** |
| Pet-related fields | Not observable | **Fail for immediate use** |

Strictly applied, this candidate fails on the first gate: no inventory.

## Required Evaluation Dimensions

Because the dataset was empty, none of the requested quality checks can be passed:

- `photos[]` usable public URLs: unverified, because there were no rows
- Actual listing/interior photos vs floor plans/placeholders: unverified
- Borough quality: unverified
- Neighborhood quality: unverified
- Address quality: unverified
- Original listing URL quality: unverified
- Price / bedrooms / bathrooms coverage: unverified
- Pet-related fields: unverified

For an immediate migration target, "unverified because zero output" is a failure, not a caveat.

## Comparison To Current Provider Need

The current production provider has image problems, but it does return listings. This candidate does not solve the image problem and introduces a worse failure mode:

- Current provider: listings present, image quality inadequate
- `epctex~apartments-scraper` (non-API): no listings returned

Replacing production with this actor would collapse inventory to zero.

## Decision

`epctex~apartments-scraper` is **not** a viable immediate replacement for the current provider.

Do not migrate.

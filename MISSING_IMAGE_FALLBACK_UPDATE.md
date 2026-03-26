# MISSING_IMAGE_FALLBACK_UPDATE

## Files changed

- [components/DecisionListingCard.tsx](/C:/Users/Luciano/pepe-mvp2/components/DecisionListingCard.tsx)
- [MISSING_IMAGE_FALLBACK_UPDATE.md](/C:/Users/Luciano/pepe-mvp2/MISSING_IMAGE_FALLBACK_UPDATE.md)

## Fallback trigger

The fallback renders when the card image URL is not usable.

Current condition:

- `listing.image_url` and `listing.images?.[0]` are both missing, empty, or whitespace
- or the resolved image URL is not `http://` or `https://`
- or the resolved image URL contains the known placeholder marker `add7ffb`

## Exact copy used

Title:

- `Photos unavailable`

Body:

- `Photos unavailable for this listing. Tap See listing details to view photos and more information.`

## Assumptions made

- Existing CTA label should remain unchanged, so this update does not rename any buttons.
- The current single-image resolution order should remain `image_url` first, then `images[0]`.
- Known placeholder detection should keep using the existing `add7ffb` check.

## Unresolved

- This patch does not attempt to classify floor plans vs real photos beyond the current placeholder check.
- It does not change scraper behavior, normalization, or database schema.
- It does not add image `onError` recovery; it covers missing or clearly unusable values at render time.

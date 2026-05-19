# SCRAPER_VISUALS_SPIKE_REPORT

Date: 2026-03-25T14:35:07.511Z

## Test Method

Method used: isolated local-only script

- Script: `scripts/apify-visuals-spike.mjs`
- Production routes modified: none
- Deployment required: no
- Current actor tested: `epctex~apartments-scraper-api`
- Input delta from production: `includeVisuals: true`, reduced sample size

## Files Created Or Modified

- Created: [scripts/apify-visuals-spike.mjs](/C:/Users/Luciano/pepe-mvp2/scripts/apify-visuals-spike.mjs)
- Created: [SCRAPER_VISUALS_SPIKE_RAW.json](/C:/Users/Luciano/pepe-mvp2/SCRAPER_VISUALS_SPIKE_RAW.json)
- Created: [SCRAPER_VISUALS_SPIKE_SUMMARY.json](/C:/Users/Luciano/pepe-mvp2/SCRAPER_VISUALS_SPIKE_SUMMARY.json)
- Created: [SCRAPER_VISUALS_SPIKE_REPORT.md](/C:/Users/Luciano/pepe-mvp2/SCRAPER_VISUALS_SPIKE_REPORT.md)

## Actor Input Used

```json
{
  "startUrls": [
    "https://www.apartments.com/new-york-ny/",
    "https://www.apartments.com/brooklyn-ny/",
    "https://www.apartments.com/new-york-ny/studio-apartments/"
  ],
  "includeReviews": false,
  "includeVisuals": true,
  "includeInteriorAmenities": true,
  "includeWalkScore": false,
  "maxItems": 10
}
```

## Run Metadata

- Run ID: `eyAI1WK17gHAPHcLh`
- Status: `SUCCEEDED`
- Raw items returned: 10
- Raw payload size: 266376 bytes (260.1 KiB)
- Average bytes per item: 26638 bytes

## Image Findings

- Verdict: No clear salvage signal from this spike. Visuals-enabled run did not show enough real gallery photos in `images[]`.
- Recommended new primary source: `models[0].image`
- Items with any `images[]`: 0/10
- Items with photo-like `images[]`: 0/10
- Items where `models[0].image` looked floor-plan-like: 0/10
- Items where `models[0].image` looked photo-like: 6/10
- Items where `models[0].image` differed from `images[0]`: 0/10
- Items with no usable photo candidate: 4/10

## Recommended Normalization Priority

- `gallery_images[0]` / first valid `images[]` photo-like URL
- `models[0].imageLarge` only if photo-like and no gallery photo exists
- `models[0].image` only if photo-like and no better candidate exists
- `imageUrl` / `mainImage` / `heroImage` as late fallback
- otherwise null

## Payload / Cost Notes

- Usage fields captured from run object:

```json
{
  "usageTotalUsd": 0.0327,
  "pricingModel": null,
  "totalChargeUsd": null,
  "stats": {
    "inputBodyLen": 275,
    "migrationCount": 0,
    "rebootCount": 0,
    "restartCount": 0,
    "durationMillis": 35432,
    "resurrectCount": 0,
    "runTimeSecs": 35.432,
    "metamorph": 0,
    "computeUnits": 0.0024605555555555557,
    "memAvgBytes": 75289578.94627084,
    "memMaxBytes": 80785408,
    "memCurrentBytes": 78868480,
    "cpuAvgUsage": 2.5287488765272155,
    "cpuMaxUsage": 145.24718711276333,
    "cpuCurrentUsage": 2.0177292046144504,
    "netRxBytes": 332708,
    "netTxBytes": 151332
  }
}
```

- Payload increase should be measured against a second baseline run with `includeVisuals: false` using the same reduced sample.
- If `usageTotalUsd` or `totalChargeUsd` is null, inspect the Apify run page directly for billed usage.

## Production Recommendation

- Stay on current actor in production: not yet proven
- Replacement migration needed now: still possible if repeated spikes fail

## Top Sample Items

```json
[
  {
    "id": "80g1zt0",
    "url": "https://www.apartments.com/the-equestrian-at-pelham-parkway/80g1zt0/",
    "propertyName": "The Equestrian At Pelham Parkway",
    "imageFieldCounts": {
      "images": 0,
      "photoLikeImages": 0,
      "floorPlanLikeImages": 0
    },
    "candidates": {
      "images": [],
      "model0image": null,
      "model0imageLarge": null,
      "imageUrl": null,
      "thumbnailUrl": null,
      "mainImage": null,
      "heroImage": null
    },
    "classifications": {
      "images[0]": "missing",
      "models[0].image": "missing",
      "models[0].imageLarge": "missing",
      "imageUrl": "missing",
      "thumbnailUrl": "missing",
      "mainImage": "missing",
      "heroImage": "missing"
    },
    "recommendedPrimary": null,
    "sampleGallery": [],
    "sampleModel0": {
      "image": null,
      "imageLarge": null
    }
  },
  {
    "id": "db9r3kj",
    "url": "https://www.apartments.com/the-riverdale-tower/db9r3kj/",
    "propertyName": "The Riverdale Tower",
    "imageFieldCounts": {
      "images": 0,
      "photoLikeImages": 0,
      "floorPlanLikeImages": 0
    },
    "candidates": {
      "images": [],
      "model0image": "https://images1.apartments.com/i2/fbn058VkEiGH_ZoB606B6TF7eG2rjdkshYAuqAJRjAo/105/image.jpg",
      "model0imageLarge": "https://images1.apartments.com/i2/fbn058VkEiGH_ZoB606B6TF7eG2rjdkshYAuqAJRjAo/117/image.jpg",
      "imageUrl": null,
      "thumbnailUrl": null,
      "mainImage": null,
      "heroImage": null
    },
    "classifications": {
      "images[0]": "missing",
      "models[0].image": "photo-like",
      "models[0].imageLarge": "photo-like",
      "imageUrl": "missing",
      "thumbnailUrl": "missing",
      "mainImage": "missing",
      "heroImage": "missing"
    },
    "recommendedPrimary": "https://images1.apartments.com/i2/fbn058VkEiGH_ZoB606B6TF7eG2rjdkshYAuqAJRjAo/105/image.jpg",
    "sampleGallery": [],
    "sampleModel0": {
      "image": "https://images1.apartments.com/i2/fbn058VkEiGH_ZoB606B6TF7eG2rjdkshYAuqAJRjAo/105/image.jpg",
      "imageLarge": "https://images1.apartments.com/i2/fbn058VkEiGH_ZoB606B6TF7eG2rjdkshYAuqAJRjAo/117/image.jpg"
    }
  },
  {
    "id": "2vjnkfb",
    "url": "https://www.apartments.com/the-station-apartments/2vjnkfb/",
    "propertyName": "The Station Apartments",
    "imageFieldCounts": {
      "images": 0,
      "photoLikeImages": 0,
      "floorPlanLikeImages": 0
    },
    "candidates": {
      "images": [],
      "model0image": "https://images1.apartments.com/i2/3Uk_jJMR-k4LY79-BXd7lpRh6ZHoII44nsu8Ak0bp0g/105/image.jpg",
      "model0imageLarge": "https://images1.apartments.com/i2/3Uk_jJMR-k4LY79-BXd7lpRh6ZHoII44nsu8Ak0bp0g/117/image.jpg",
      "imageUrl": null,
      "thumbnailUrl": null,
      "mainImage": null,
      "heroImage": null
    },
    "classifications": {
      "images[0]": "missing",
      "models[0].image": "photo-like",
      "models[0].imageLarge": "photo-like",
      "imageUrl": "missing",
      "thumbnailUrl": "missing",
      "mainImage": "missing",
      "heroImage": "missing"
    },
    "recommendedPrimary": "https://images1.apartments.com/i2/3Uk_jJMR-k4LY79-BXd7lpRh6ZHoII44nsu8Ak0bp0g/105/image.jpg",
    "sampleGallery": [],
    "sampleModel0": {
      "image": "https://images1.apartments.com/i2/3Uk_jJMR-k4LY79-BXd7lpRh6ZHoII44nsu8Ak0bp0g/105/image.jpg",
      "imageLarge": "https://images1.apartments.com/i2/3Uk_jJMR-k4LY79-BXd7lpRh6ZHoII44nsu8Ak0bp0g/117/image.jpg"
    }
  },
  {
    "id": "vh82btd",
    "url": "https://www.apartments.com/found-study-brooklyn-heights/vh82btd/",
    "propertyName": "FOUND Study Brooklyn Heights",
    "imageFieldCounts": {
      "images": 0,
      "photoLikeImages": 0,
      "floorPlanLikeImages": 0
    },
    "candidates": {
      "images": [],
      "model0image": "https://images1.apartments.com/i2/mwnhimTI17l0K3RbOZSVk2LocgJYaT4_uktnWmnunPc/105/image.jpg",
      "model0imageLarge": "https://images1.apartments.com/i2/mwnhimTI17l0K3RbOZSVk2LocgJYaT4_uktnWmnunPc/117/image.jpg",
      "imageUrl": null,
      "thumbnailUrl": null,
      "mainImage": null,
      "heroImage": null
    },
    "classifications": {
      "images[0]": "missing",
      "models[0].image": "photo-like",
      "models[0].imageLarge": "photo-like",
      "imageUrl": "missing",
      "thumbnailUrl": "missing",
      "mainImage": "missing",
      "heroImage": "missing"
    },
    "recommendedPrimary": "https://images1.apartments.com/i2/mwnhimTI17l0K3RbOZSVk2LocgJYaT4_uktnWmnunPc/105/image.jpg",
    "sampleGallery": [],
    "sampleModel0": {
      "image": "https://images1.apartments.com/i2/mwnhimTI17l0K3RbOZSVk2LocgJYaT4_uktnWmnunPc/105/image.jpg",
      "imageLarge": "https://images1.apartments.com/i2/mwnhimTI17l0K3RbOZSVk2LocgJYaT4_uktnWmnunPc/117/image.jpg"
    }
  },
  {
    "id": "21jytlc",
    "url": "https://www.apartments.com/the-vitagraph/21jytlc/",
    "propertyName": "The Vitagraph",
    "imageFieldCounts": {
      "images": 0,
      "photoLikeImages": 0,
      "floorPlanLikeImages": 0
    },
    "candidates": {
      "images": [],
      "model0image": null,
      "model0imageLarge": null,
      "imageUrl": null,
      "thumbnailUrl": null,
      "mainImage": null,
      "heroImage": null
    },
    "classifications": {
      "images[0]": "missing",
      "models[0].image": "missing",
      "models[0].imageLarge": "missing",
      "imageUrl": "missing",
      "thumbnailUrl": "missing",
      "mainImage": "missing",
      "heroImage": "missing"
    },
    "recommendedPrimary": null,
    "sampleGallery": [],
    "sampleModel0": {
      "image": null,
      "imageLarge": null
    }
  }
]
```

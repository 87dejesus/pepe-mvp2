import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, '.env.local');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}

function looksLikeFloorPlan(url) {
  if (!url) return false;
  return /floor[ _-]?plan|floorplan|fp[._/-]|\/fp\/|\/plan\/|blueprint|siteplan/i.test(url);
}

function classifyImage(url) {
  if (!url) return 'missing';
  if (!/^https?:\/\//i.test(url)) return 'invalid';
  if (looksLikeFloorPlan(url)) return 'floor-plan-like';
  return 'photo-like';
}

function uniqueUrls(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const url = safeUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function candidateUrls(item) {
  const model0 = item?.models?.[0] ?? {};
  return {
    images: uniqueUrls(Array.isArray(item?.images) ? item.images : []),
    model0image: safeUrl(model0.image),
    model0imageLarge: safeUrl(model0.imageLarge),
    imageUrl: safeUrl(item?.imageUrl),
    thumbnailUrl: safeUrl(item?.thumbnailUrl),
    mainImage: safeUrl(item?.mainImage),
    heroImage: safeUrl(item?.heroImage),
  };
}

function recommendPrimaryField(items) {
  const score = {
    'images[]': 0,
    'models[0].image': 0,
    'models[0].imageLarge': 0,
    imageUrl: 0,
    thumbnailUrl: 0,
    mainImage: 0,
    heroImage: 0,
  };

  for (const item of items) {
    const c = item.candidates;
    if (c.images.some(url => classifyImage(url) === 'photo-like')) score['images[]'] += 2;
    if (classifyImage(c.model0image) === 'photo-like') score['models[0].image'] += 1;
    if (classifyImage(c.model0image) === 'floor-plan-like') score['models[0].image'] -= 2;
    if (classifyImage(c.model0imageLarge) === 'photo-like') score['models[0].imageLarge'] += 1;
    if (classifyImage(c.model0imageLarge) === 'floor-plan-like') score['models[0].imageLarge'] -= 2;
    if (classifyImage(c.imageUrl) === 'photo-like') score.imageUrl += 1;
    if (classifyImage(c.thumbnailUrl) === 'photo-like') score.thumbnailUrl += 1;
    if (classifyImage(c.mainImage) === 'photo-like') score.mainImage += 1;
    if (classifyImage(c.heroImage) === 'photo-like') score.heroImage += 1;
  }

  return Object.entries(score).sort((a, b) => b[1] - a[1]);
}

function buildPerItemSummary(item) {
  const candidates = candidateUrls(item);
  const photoLikeImages = candidates.images.filter(url => classifyImage(url) === 'photo-like');
  const floorPlanLikeImages = candidates.images.filter(url => classifyImage(url) === 'floor-plan-like');
  const model0Classification = classifyImage(candidates.model0image);
  const model0LargeClassification = classifyImage(candidates.model0imageLarge);

  return {
    id: item?.id ?? null,
    url: item?.url ?? null,
    propertyName: item?.propertyName ?? null,
    imageFieldCounts: {
      images: candidates.images.length,
      photoLikeImages: photoLikeImages.length,
      floorPlanLikeImages: floorPlanLikeImages.length,
    },
    candidates,
    classifications: {
      'images[0]': classifyImage(candidates.images[0] ?? null),
      'models[0].image': model0Classification,
      'models[0].imageLarge': model0LargeClassification,
      imageUrl: classifyImage(candidates.imageUrl),
      thumbnailUrl: classifyImage(candidates.thumbnailUrl),
      mainImage: classifyImage(candidates.mainImage),
      heroImage: classifyImage(candidates.heroImage),
    },
    recommendedPrimary: photoLikeImages[0] ?? (
      model0Classification === 'photo-like' ? candidates.model0image : (
        model0LargeClassification === 'photo-like' ? candidates.model0imageLarge : null
      )
    ),
    sampleGallery: candidates.images.slice(0, 3),
    sampleModel0: {
      image: candidates.model0image,
      imageLarge: candidates.model0imageLarge,
    },
  };
}

function buildAggregate(summaryItems) {
  const totals = {
    items: summaryItems.length,
    withAnyImagesArray: 0,
    withPhotoLikeImagesArray: 0,
    withFloorPlanLikeModel0: 0,
    withPhotoLikeModel0: 0,
    withDifferentModel0AndImages0: 0,
    withRecommendedPrimaryFromImages: 0,
    withNoUsablePhoto: 0,
  };

  for (const item of summaryItems) {
    const images0 = item.candidates.images[0] ?? null;
    if (item.candidates.images.length > 0) totals.withAnyImagesArray += 1;
    if (item.candidates.images.some(url => classifyImage(url) === 'photo-like')) totals.withPhotoLikeImagesArray += 1;
    if (item.classifications['models[0].image'] === 'floor-plan-like') totals.withFloorPlanLikeModel0 += 1;
    if (item.classifications['models[0].image'] === 'photo-like') totals.withPhotoLikeModel0 += 1;
    if (images0 && item.candidates.model0image && images0 !== item.candidates.model0image) totals.withDifferentModel0AndImages0 += 1;
    if (item.recommendedPrimary && item.candidates.images.includes(item.recommendedPrimary)) totals.withRecommendedPrimaryFromImages += 1;
    if (!item.recommendedPrimary) totals.withNoUsablePhoto += 1;
  }

  return totals;
}

function bytesToKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(repoRoot, fileName), JSON.stringify(data, null, 2));
}

function writeMarkdown(fileName, content) {
  fs.writeFileSync(path.join(repoRoot, fileName), content);
}

async function startRun(token, actorId, input) {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Failed to start actor run: HTTP ${res.status} ${res.statusText}\n${await res.text()}`);
  }
  const data = await res.json();
  const runId = data?.data?.id;
  if (!runId) throw new Error('Apify start run response did not include run id');
  return { runId, startResponse: data };
}

async function pollRun(token, runId, timeoutMs = 8 * 60 * 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to poll actor run ${runId}: HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const status = data?.data?.status ?? 'UNKNOWN';
    if (status === 'SUCCEEDED') return data;
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run ${runId} ended with status ${status}`);
    }
    await sleep(10000);
  }
  throw new Error(`Timed out waiting for actor run ${runId}`);
}

async function fetchDatasetItems(token, runId) {
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&clean=true`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset items: HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function buildReport({ actorId, input, runId, runData, rawItems, summaryItems, aggregate, recommendedFields }) {
  const rawBytes = Buffer.byteLength(JSON.stringify(rawItems), 'utf8');
  const avgBytes = rawItems.length > 0 ? Math.round(rawBytes / rawItems.length) : 0;
  const usage = runData?.data ?? {};
  const costFields = {
    usageTotalUsd: usage.usageTotalUsd ?? null,
    pricingModel: usage.pricingModel ?? null,
    totalChargeUsd: usage.totalChargeUsd ?? null,
    stats: usage.stats ?? null,
  };

  const verdict = aggregate.withPhotoLikeImagesArray > 0
    ? 'Yes, the actor appears salvageable if visuals-enabled runs populate `images[]` with real gallery photos.'
    : 'No clear salvage signal from this spike. Visuals-enabled run did not show enough real gallery photos in `images[]`.';

  const primaryField = recommendedFields[0]?.[0] ?? 'undetermined';
  const priorityList = [
    '`gallery_images[0]` / first valid `images[]` photo-like URL',
    '`models[0].imageLarge` only if photo-like and no gallery photo exists',
    '`models[0].image` only if photo-like and no better candidate exists',
    '`imageUrl` / `mainImage` / `heroImage` as late fallback',
    'otherwise null',
  ];

  return `# SCRAPER_VISUALS_SPIKE_REPORT

Date: ${new Date().toISOString()}

## Test Method

Method used: isolated local-only script

- Script: \`scripts/apify-visuals-spike.mjs\`
- Production routes modified: none
- Deployment required: no
- Current actor tested: \`${actorId}\`
- Input delta from production: \`includeVisuals: true\`, reduced sample size

## Files Created Or Modified

- Created: [scripts/apify-visuals-spike.mjs](/C:/Users/Luciano/pepe-mvp2/scripts/apify-visuals-spike.mjs)
- Created: [SCRAPER_VISUALS_SPIKE_RAW.json](/C:/Users/Luciano/pepe-mvp2/SCRAPER_VISUALS_SPIKE_RAW.json)
- Created: [SCRAPER_VISUALS_SPIKE_SUMMARY.json](/C:/Users/Luciano/pepe-mvp2/SCRAPER_VISUALS_SPIKE_SUMMARY.json)
- Created: [SCRAPER_VISUALS_SPIKE_REPORT.md](/C:/Users/Luciano/pepe-mvp2/SCRAPER_VISUALS_SPIKE_REPORT.md)

## Actor Input Used

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

## Run Metadata

- Run ID: \`${runId}\`
- Status: \`${usage.status ?? 'SUCCEEDED'}\`
- Raw items returned: ${rawItems.length}
- Raw payload size: ${rawBytes} bytes (${bytesToKiB(rawBytes)})
- Average bytes per item: ${avgBytes} bytes

## Image Findings

- Verdict: ${verdict}
- Recommended new primary source: \`${primaryField}\`
- Items with any \`images[]\`: ${aggregate.withAnyImagesArray}/${aggregate.items}
- Items with photo-like \`images[]\`: ${aggregate.withPhotoLikeImagesArray}/${aggregate.items}
- Items where \`models[0].image\` looked floor-plan-like: ${aggregate.withFloorPlanLikeModel0}/${aggregate.items}
- Items where \`models[0].image\` looked photo-like: ${aggregate.withPhotoLikeModel0}/${aggregate.items}
- Items where \`models[0].image\` differed from \`images[0]\`: ${aggregate.withDifferentModel0AndImages0}/${aggregate.items}
- Items with no usable photo candidate: ${aggregate.withNoUsablePhoto}/${aggregate.items}

## Recommended Normalization Priority

${priorityList.map(line => `- ${line}`).join('\n')}

## Payload / Cost Notes

- Usage fields captured from run object:

\`\`\`json
${JSON.stringify(costFields, null, 2)}
\`\`\`

- Payload increase should be measured against a second baseline run with \`includeVisuals: false\` using the same reduced sample.
- If \`usageTotalUsd\` or \`totalChargeUsd\` is null, inspect the Apify run page directly for billed usage.

## Production Recommendation

- Stay on current actor in production: ${aggregate.withPhotoLikeImagesArray > 0 ? 'yes, pending a controlled normalization change' : 'not yet proven'}
- Replacement migration needed now: ${aggregate.withPhotoLikeImagesArray > 0 ? 'no' : 'still possible if repeated spikes fail'}

## Top Sample Items

\`\`\`json
${JSON.stringify(summaryItems.slice(0, 5), null, 2)}
\`\`\`
`;
}

async function main() {
  loadEnvFile(envPath);

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error(
      'APIFY_TOKEN is required. Add APIFY_TOKEN=... to C:\\Users\\Luciano\\pepe-mvp2\\.env.local or pass it inline: $env:APIFY_TOKEN="..." ; node scripts\\apify-visuals-spike.mjs'
    );
  }

  const actorId = process.env.APIFY_ACTOR_ID ?? 'epctex~apartments-scraper-api';
  const input = {
    startUrls: [
      'https://www.apartments.com/new-york-ny/',
      'https://www.apartments.com/brooklyn-ny/',
      'https://www.apartments.com/new-york-ny/studio-apartments/',
    ],
    includeReviews: false,
    includeVisuals: true,
    includeInteriorAmenities: true,
    includeWalkScore: false,
    maxItems: 10,
  };

  console.log(`Starting visuals spike for actor ${actorId}...`);
  const { runId } = await startRun(token, actorId, input);
  console.log(`Run started: ${runId}`);

  const runData = await pollRun(token, runId);
  console.log(`Run completed: ${runId}`);

  const rawItems = await fetchDatasetItems(token, runId);
  const summaryItems = rawItems.map(buildPerItemSummary);
  const aggregate = buildAggregate(summaryItems);
  const recommendedFields = recommendPrimaryField(summaryItems);

  writeJson('SCRAPER_VISUALS_SPIKE_RAW.json', rawItems);
  writeJson('SCRAPER_VISUALS_SPIKE_SUMMARY.json', {
    runId,
    actorId,
    input,
    aggregate,
    recommendedFields,
    items: summaryItems,
  });
  writeMarkdown(
    'SCRAPER_VISUALS_SPIKE_REPORT.md',
    buildReport({ actorId, input, runId, runData, rawItems, summaryItems, aggregate, recommendedFields })
  );

  console.log('Wrote SCRAPER_VISUALS_SPIKE_RAW.json');
  console.log('Wrote SCRAPER_VISUALS_SPIKE_SUMMARY.json');
  console.log('Wrote SCRAPER_VISUALS_SPIKE_REPORT.md');
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

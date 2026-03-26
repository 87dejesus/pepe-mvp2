/**
 * One-off script: fetch 5 items from last Apify run and log image fields.
 * Run: npx ts-node scripts/test-image.ts
 */

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error('APIFY_TOKEN not set. Add it to .env.local or prefix: APIFY_TOKEN=xxx npx ts-node scripts/test-image.ts');
  process.exit(1);
}

async function main() {
  const url = `https://api.apify.com/v2/acts/epctex~apartments-scraper-api/runs/last/dataset/items?limit=5&token=${token}&clean=true`;
  console.log('Fetching from:', url.replace(token!, 'TOKEN_HIDDEN'));

  const res = await fetch(url);
  if (!res.ok) {
    console.error('HTTP error:', res.status, await res.text());
    process.exit(1);
  }

  const items: any[] = await res.json();
  console.log(`Got ${items.length} items\n`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`--- Item ${i + 1} ---`);
    console.log('id:                   ', item.id);
    console.log('images:               ', item.images);
    console.log('models[0].image:      ', item.models?.[0]?.image);
    console.log('models[0].imageLarge: ', item.models?.[0]?.imageLarge);
    console.log('imageUrl:             ', item.imageUrl);
    console.log('thumbnailUrl:         ', item.thumbnailUrl);
    console.log('mainImage:            ', item.mainImage);
    console.log('heroImage:            ', item.heroImage);
    console.log('ALL KEYS:             ', Object.keys(item).join(', '));
    console.log();
  }
}

main().catch(console.error);

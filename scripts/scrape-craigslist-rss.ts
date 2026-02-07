/**
 * PEPE 3.0 - Craigslist RSS Scraper
 *
 * Uses Craigslist's RSS feed — no bot protection, no CAPTCHA.
 * Most reliable data source for populating listings.
 *
 * Usage:
 *   npx tsx scripts/scrape-craigslist-rss.ts              # Scrape all
 *   npx tsx scripts/scrape-craigslist-rss.ts --limit 10   # Limit to 10
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// CLI flags
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 999 : 999;

// RSS feeds per borough
const RSS_FEEDS: Record<string, string> = {
  all: "https://newyork.craigslist.org/search/apa?format=rss",
  manhattan: "https://newyork.craigslist.org/mnh/apa?format=rss",
  brooklyn: "https://newyork.craigslist.org/brk/apa?format=rss",
  queens: "https://newyork.craigslist.org/que/apa?format=rss",
  bronx: "https://newyork.craigslist.org/brx/apa?format=rss",
};

// UA rotation for RSS
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] INFO  ${msg}`),
  warn: (msg: string) => console.log(`[${new Date().toISOString()}] WARN  ${msg}`),
  error: (msg: string) => console.log(`[${new Date().toISOString()}] ERROR ${msg}`),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] OK    ${msg}`),
};

function normalizeBorough(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("manhattan") || lower.includes("midtown") || lower.includes("harlem") ||
      lower.includes("upper east") || lower.includes("upper west") || lower.includes("chelsea") ||
      lower.includes("soho") || lower.includes("tribeca") || lower.includes("village") ||
      lower.includes("lower east") || lower.includes("financial") || lower.includes("murray hill") ||
      lower.includes("gramercy")) return "Manhattan";
  if (lower.includes("brooklyn") || lower.includes("williamsburg") || lower.includes("bushwick") ||
      lower.includes("bed-stuy") || lower.includes("park slope") || lower.includes("greenpoint") ||
      lower.includes("crown heights") || lower.includes("flatbush") || lower.includes("dumbo")) return "Brooklyn";
  if (lower.includes("queens") || lower.includes("astoria") || lower.includes("flushing") ||
      lower.includes("jamaica") || lower.includes("long island city") || lower.includes("lic") ||
      lower.includes("jackson heights")) return "Queens";
  if (lower.includes("bronx") || lower.includes("fordham") || lower.includes("riverdale")) return "Bronx";
  if (lower.includes("staten")) return "Staten Island";
  return "Manhattan";
}

function extractPrice(text: string): number {
  const match = text.match(/\$[\d,]+/);
  if (!match) return 0;
  return parseInt(match[0].replace(/[$,]/g, ""), 10) || 0;
}

function extractBedrooms(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("studio")) return 0;
  const match = lower.match(/(\d+)\s*(?:br|bed|bedroom)/);
  return match ? parseInt(match[1], 10) : 1;
}

function extractVibeKeywords(text: string): string[] {
  const keywords = [
    "light", "bright", "sunny", "quiet", "peaceful", "charm", "charming",
    "cozy", "spacious", "modern", "renovated", "exposed brick", "hardwood",
    "natural light", "doorman", "laundry", "dishwasher", "high ceilings",
    "pre-war", "views", "rooftop", "garden", "no fee"
  ];
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k));
}

async function fetchRSS(url: string, attempt: number = 0): Promise<RSSItem[]> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  log.info(`Fetching RSS: ${url} (attempt ${attempt + 1}/${MAX_RETRIES})`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": ua,
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if ((response.status === 403 || response.status === 429) && attempt < MAX_RETRIES - 1) {
        log.warn(`HTTP ${response.status} - retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return fetchRSS(url, attempt + 1);
      }
      log.error(`HTTP ${response.status} from RSS feed`);
      return [];
    }

    const xml = await response.text();
    log.info(`Response: ${xml.length} chars`);

    const items: RSSItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
      const dateMatch = itemXml.match(/<dc:date>(.*?)<\/dc:date>|<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch && linkMatch) {
        items.push({
          title: (titleMatch[1] || titleMatch[2] || "").trim(),
          link: linkMatch[1].trim(),
          description: (descMatch?.[1] || descMatch?.[2] || "").trim(),
          pubDate: (dateMatch?.[1] || dateMatch?.[2] || "").trim(),
        });
      }
    }

    return items;

  } catch (error: any) {
    if (attempt < MAX_RETRIES - 1) {
      log.warn(`Fetch error: ${error.message} - retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      return fetchRSS(url, attempt + 1);
    }
    log.error(`Failed after ${MAX_RETRIES} attempts: ${error.message}`);
    return [];
  }
}

async function getExistingUrls(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("listings")
    .select("original_url")
    .eq("status", "Active");

  if (error) {
    log.warn(`Could not fetch existing URLs: ${error.message}`);
    return new Set();
  }

  return new Set((data || []).map(d => d.original_url).filter(Boolean));
}

async function main() {
  console.log("=".repeat(60));
  console.log("PEPE 3.0 - Craigslist RSS Scraper");
  console.log("=".repeat(60));
  console.log();

  log.info(`Limit: ${LIMIT === 999 ? 'none' : LIMIT}`);

  try {
    // Fetch existing URLs for dedup
    const existingUrls = await getExistingUrls();
    log.info(`Existing listings in DB: ${existingUrls.size}`);

    // Fetch RSS (use 'all' feed for maximum coverage)
    const items = await fetchRSS(RSS_FEEDS.all);
    log.info(`Found ${items.length} items in RSS feed`);

    if (items.length === 0) {
      log.warn("No items in feed. Craigslist may be temporarily blocking or feed is empty.");
      return;
    }

    // Convert to listings
    const listings = items
      .map((item) => {
        const price = extractPrice(item.title);
        if (price <= 0 || price > 20000) return null;

        return {
          address: item.title.replace(/\$[\d,]+/, "").trim().slice(0, 200),
          borough: normalizeBorough(item.title + " " + item.description),
          price,
          bedrooms: extractBedrooms(item.title),
          bathrooms: 1,
          pets: "Unknown",
          original_url: item.link,
          description: item.description.slice(0, 500),
          status: "Active",
        };
      })
      .filter((l) => l !== null);

    // Dedup against existing database
    const newListings = listings.filter(l => !existingUrls.has(l.original_url));
    const duplicateCount = listings.length - newListings.length;

    log.info(`Valid: ${listings.length} | New: ${newListings.length} | Duplicates: ${duplicateCount}`);

    // Apply limit
    const limited = newListings.slice(0, LIMIT);

    if (limited.length === 0) {
      log.warn("No new listings to save (all duplicates or filtered out)");
      console.log("\nDone. 0 new listings.");
      return;
    }

    // Show sample
    console.log("\nSample listings:");
    limited.slice(0, 5).forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.address.slice(0, 60)}...`);
      console.log(`     $${l.price} | ${l.bedrooms}BR | ${l.borough}`);
      if (l.vibe_keywords.length > 0) {
        console.log(`     Vibe: ${l.vibe_keywords.join(", ")}`);
      }
    });
    if (limited.length > 5) {
      console.log(`  ... and ${limited.length - 5} more`);
    }

    // Save to database
    console.log();
    log.info(`Saving ${limited.length} new listings to database...`);
    const { data, error } = await supabase
      .from("listings")
      .insert(limited)
      .select("id");

    if (error) {
      log.error(`Failed to save: ${error.message}`);
      return;
    }

    log.success(`Saved ${data?.length || 0} listings to database`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`RSS items:        ${items.length}`);
    console.log(`Valid listings:   ${listings.length}`);
    console.log(`Already in DB:    ${duplicateCount}`);
    console.log(`Saved:            ${data?.length || 0}`);
    console.log("=".repeat(60));

  } catch (err) {
    log.error(`Fatal: ${err}`);
  }

  console.log("\nDone.");
}

main();

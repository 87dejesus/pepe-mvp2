/**
 * PEPE 2.0 - Craigslist RSS Scraper
 *
 * Uses Craigslist's RSS feed instead of web scraping.
 * RSS feeds don't have bot protection.
 *
 * Run: npx tsx scripts/scrape-craigslist-rss.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// RSS feed URL for NYC apartments
const RSS_URL = "https://newyork.craigslist.org/search/apa?format=rss";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function normalizeBorough(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("manhattan") || lower.includes("midtown") || lower.includes("harlem") ||
      lower.includes("upper east") || lower.includes("upper west") || lower.includes("chelsea") ||
      lower.includes("soho") || lower.includes("tribeca") || lower.includes("village") ||
      lower.includes("lower east") || lower.includes("financial")) return "Manhattan";
  if (lower.includes("brooklyn") || lower.includes("williamsburg") || lower.includes("bushwick") ||
      lower.includes("bed-stuy") || lower.includes("park slope") || lower.includes("greenpoint") ||
      lower.includes("crown heights") || lower.includes("flatbush")) return "Brooklyn";
  if (lower.includes("queens") || lower.includes("astoria") || lower.includes("flushing") ||
      lower.includes("jamaica") || lower.includes("long island city") || lower.includes("lic")) return "Queens";
  if (lower.includes("bronx") || lower.includes("fordham") || lower.includes("riverdale")) return "Bronx";
  if (lower.includes("staten")) return "Staten Island";
  return "Manhattan"; // Default
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

async function fetchRSS(): Promise<RSSItem[]> {
  console.log(`Fetching RSS: ${RSS_URL}`);

  const response = await fetch(RSS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  console.log(`Response status: ${response.status}`);
  const xml = await response.text();
  console.log(`Response length: ${xml.length} chars`);

  // Simple XML parsing (no external deps)
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
}

async function main() {
  console.log("=".repeat(60));
  console.log("PEPE 2.0 - Craigslist RSS Scraper");
  console.log("=".repeat(60));
  console.log();

  try {
    const items = await fetchRSS();
    console.log(`Found ${items.length} listings in RSS feed\n`);

    if (items.length === 0) {
      console.log("No items in feed. Craigslist may be blocking requests.");
      return;
    }

    // Convert to listings
    const listings = items
      .map((item) => {
        const price = extractPrice(item.title);
        if (price <= 0 || price > 20000) return null; // Filter unrealistic prices

        return {
          address: item.title.replace(/\$[\d,]+/, "").trim().slice(0, 200),
          borough: normalizeBorough(item.title + " " + item.description),
          price,
          bedrooms: extractBedrooms(item.title),
          bathrooms: 1,
          pets: "Unknown",
          original_url: item.link,
          description: item.description.slice(0, 500),
          vibe_keywords: extractVibeKeywords(item.title + " " + item.description),
          freshness_score: 80, // RSS items are recent
          status: "Active",
        };
      })
      .filter((l) => l !== null);

    console.log(`Valid listings: ${listings.length}\n`);

    // Show sample
    listings.slice(0, 5).forEach((l, i) => {
      console.log(`${i + 1}. ${l!.address.slice(0, 50)}...`);
      console.log(`   $${l!.price} | ${l!.bedrooms}BR | ${l!.borough}`);
      if (l!.vibe_keywords.length > 0) {
        console.log(`   Vibe: ${l!.vibe_keywords.join(", ")}`);
      }
      console.log();
    });

    if (listings.length > 5) {
      console.log(`... and ${listings.length - 5} more\n`);
    }

    // Save to database
    console.log("Saving to database...");
    const { data, error } = await supabase
      .from("listings")
      .insert(listings)
      .select("id");

    if (error) {
      console.error("Failed to save:", error.message);
      return;
    }

    console.log(`Saved ${data?.length || 0} listings to database.`);
  } catch (err) {
    console.error("Error:", err);
  }

  console.log("\nDone.");
}

main();

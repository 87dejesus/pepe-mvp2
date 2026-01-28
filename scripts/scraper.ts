/**
 * PEPE 2.0 - Enhanced Rental Listings Scraper
 * Run: npx tsx scripts/scraper.ts <url>
 *
 * Features:
 * - Scrapes StreetEasy and Zillow
 * - Detects emotional "vibe" keywords (light, quiet, charm, cozy)
 * - Calculates freshness score based on listing age
 * - Stores data in the clean 'listings' table
 */

import { config } from "dotenv";
import { chromium, Browser, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// VIBE / EMOTIONAL KEYWORDS
// ============================================

const VIBE_KEYWORDS = [
  "light",
  "bright",
  "sunny",
  "quiet",
  "peaceful",
  "charm",
  "charming",
  "cozy",
  "spacious",
  "modern",
  "renovated",
  "exposed brick",
  "hardwood",
  "natural light",
  "tree-lined",
  "garden",
  "courtyard",
  "rooftop",
  "views",
  "waterfront",
  "doorman",
  "laundry in unit",
  "dishwasher",
  "central air",
  "high ceilings",
  "original details",
  "pre-war",
  "windowed kitchen",
  "open layout",
];

/**
 * Extract vibe keywords from description text
 */
function extractVibeKeywords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return VIBE_KEYWORDS.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

/**
 * Calculate freshness score (0-100)
 * Higher = more fresh/recently listed
 */
function calculateFreshnessScore(dateText: string | null): number {
  if (!dateText) return 50; // Unknown = neutral

  const lower = dateText.toLowerCase();

  // Very fresh (posted today/yesterday)
  if (lower.includes("today") || lower.includes("just listed") || lower.includes("new")) {
    return 100;
  }

  // Fresh (1-3 days)
  if (lower.includes("yesterday") || lower.includes("1 day")) {
    return 90;
  }

  // Recent (3-7 days)
  const daysMatch = lower.match(/(\d+)\s*day/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (days <= 3) return 85;
    if (days <= 7) return 70;
    if (days <= 14) return 50;
    if (days <= 30) return 30;
    return 10;
  }

  // Week-based
  const weeksMatch = lower.match(/(\d+)\s*week/);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10);
    if (weeks === 1) return 60;
    if (weeks <= 2) return 40;
    return 20;
  }

  // Month-based
  if (lower.includes("month")) {
    return 15;
  }

  return 50; // Default
}

// ============================================
// DATA CLEANING UTILITIES
// ============================================

function cleanPrice(priceStr: string): number {
  if (!priceStr) return 0;
  const match = priceStr.match(/[\d,]+/);
  if (!match) return 0;
  return parseInt(match[0].replace(/,/g, ""), 10) || 0;
}

function cleanBedrooms(bedroomStr: string): number {
  if (!bedroomStr) return 0;
  const lower = bedroomStr.toLowerCase();
  if (lower.includes("studio")) return 0;
  const match = lower.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function cleanBathrooms(bathStr: string): number {
  if (!bathStr) return 1;
  const match = bathStr.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 1;
}

function normalizeBorough(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("manhattan")) return "Manhattan";
  if (lower.includes("brooklyn")) return "Brooklyn";
  if (lower.includes("queens")) return "Queens";
  if (lower.includes("bronx")) return "Bronx";
  if (lower.includes("staten")) return "Staten Island";
  return "Manhattan";
}

function normalizePets(petStr: string | undefined): string {
  if (!petStr) return "Unknown";
  const lower = petStr.toLowerCase();

  if (lower.includes("no pet") || lower === "none") return "No pets";
  if (lower.includes("cat") && lower.includes("dog")) return "Cats & dogs allowed";
  if (lower.includes("cat")) return "Cats allowed";
  if (lower.includes("dog")) return "Dogs allowed";
  if (lower.includes("allowed") || lower.includes("yes") || lower.includes("friendly"))
    return "Cats & dogs allowed";
  if (lower.includes("case")) return "Case by case";

  return "Unknown";
}

// ============================================
// LISTING TYPE
// ============================================

interface ScrapedListing {
  address: string;
  borough: string;
  neighborhood?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  pets: string;
  image_url?: string;
  original_url: string;
  description?: string;
  vibe_keywords: string[];
  freshness_score: number;
  source: string;
}

// ============================================
// SCRAPER CLASS
// ============================================

class ListingScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    console.log("Launching browser...");
    this.browser = await chromium.launch({
      headless: false, // Visible for debugging
    });
    this.page = await this.browser.newPage();

    await this.page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Scrape StreetEasy search results
   */
  async scrapeStreetEasy(url: string): Promise<ScrapedListing[]> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for page to load...");
    await this.page.waitForTimeout(8000);

    await this.page.screenshot({ path: "streeteasy-debug.png", fullPage: true });
    console.log("Screenshot saved to streeteasy-debug.png");

    console.log("Extracting listings...");

    const listings = await this.page.evaluate(() => {
      const results: Array<{
        address: string;
        price: string;
        beds: string;
        baths: string;
        url: string;
        image: string;
        neighborhood: string;
        description: string;
        datePosted: string;
      }> = [];

      const cards = document.querySelectorAll(
        '[data-testid="listing-card"], .listingCard, .SearchResultItem, article[data-testid]'
      );

      cards.forEach((card) => {
        try {
          const addressEl = card.querySelector(
            '[data-testid="listing-address"], .listingCard-address, .details-title a, h2, h3'
          );
          const priceEl = card.querySelector(
            '[data-testid="listing-price"], .listingCard-price, .price, [data-testid="price"]'
          );
          const bedsEl = card.querySelector(
            '[data-testid="listing-beds"], .listingCard-beds, .details_info'
          );
          const bathsEl = card.querySelector('[data-testid="listing-baths"], .listingCard-baths');
          const linkEl = card.querySelector(
            'a[href*="/building/"], a[href*="/rental/"], a[href*="/for-rent/"]'
          ) as HTMLAnchorElement;
          const imgEl = card.querySelector("img") as HTMLImageElement;
          const neighborhoodEl = card.querySelector(
            '.listingCard-neighborhood, [data-testid="listing-neighborhood"]'
          );
          const descEl = card.querySelector(".listingCard-description, p");
          const dateEl = card.querySelector(
            '.listingCard-date, [data-testid="listing-date"], time'
          );

          if (addressEl && priceEl) {
            results.push({
              address: addressEl.textContent?.trim() || "",
              price: priceEl.textContent?.trim() || "",
              beds: bedsEl?.textContent?.trim() || "1",
              baths: bathsEl?.textContent?.trim() || "1",
              url: linkEl?.href || "",
              image: imgEl?.src || "",
              neighborhood: neighborhoodEl?.textContent?.trim() || "",
              description: descEl?.textContent?.trim() || "",
              datePosted: dateEl?.textContent?.trim() || "",
            });
          }
        } catch {
          // Skip malformed cards
        }
      });

      return results;
    });

    console.log(`Found ${listings.length} listings on page`);

    return listings.map((l) => ({
      address: l.address,
      borough: normalizeBorough(l.neighborhood || l.address),
      neighborhood: l.neighborhood,
      price: cleanPrice(l.price),
      bedrooms: cleanBedrooms(l.beds),
      bathrooms: cleanBathrooms(l.baths),
      pets: "Unknown",
      image_url: l.image,
      original_url: l.url,
      description: l.description,
      vibe_keywords: extractVibeKeywords(l.description + " " + l.address),
      freshness_score: calculateFreshnessScore(l.datePosted),
      source: "streeteasy",
    }));
  }

  /**
   * Scrape Zillow search results
   */
  async scrapeZillow(url: string): Promise<ScrapedListing[]> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await this.page.waitForTimeout(3000);

    console.log("Extracting listings...");

    const listings = await this.page.evaluate(() => {
      const results: Array<{
        address: string;
        price: string;
        beds: string;
        baths: string;
        url: string;
        image: string;
        description: string;
        datePosted: string;
      }> = [];

      const cards = document.querySelectorAll('[data-test="property-card"], .list-card, article');

      cards.forEach((card) => {
        try {
          const addressEl = card.querySelector('address, [data-test="property-card-addr"]');
          const priceEl = card.querySelector(
            '[data-test="property-card-price"], .list-card-price'
          );
          const bedsEl = card.querySelector(
            '[data-test="property-card-beds"], .list-card-details li:first-child'
          );
          const bathsEl = card.querySelector('[data-test="property-card-baths"]');
          const linkEl = card.querySelector(
            'a[href*="/homedetails/"], a[href*="/b/"]'
          ) as HTMLAnchorElement;
          const imgEl = card.querySelector("img") as HTMLImageElement;
          const dateEl = card.querySelector(".list-card-date, time");

          if (addressEl && priceEl) {
            results.push({
              address: addressEl.textContent?.trim() || "",
              price: priceEl.textContent?.trim() || "",
              beds: bedsEl?.textContent?.trim() || "1",
              baths: bathsEl?.textContent?.trim() || "1",
              url: linkEl?.href || "",
              image: imgEl?.src || "",
              description: "",
              datePosted: dateEl?.textContent?.trim() || "",
            });
          }
        } catch {
          // Skip
        }
      });

      return results;
    });

    console.log(`Found ${listings.length} listings`);

    return listings.map((l) => ({
      address: l.address,
      borough: normalizeBorough(l.address),
      price: cleanPrice(l.price),
      bedrooms: cleanBedrooms(l.beds),
      bathrooms: cleanBathrooms(l.baths),
      pets: "Unknown",
      image_url: l.image,
      original_url: l.url,
      description: l.description,
      vibe_keywords: extractVibeKeywords(l.description + " " + l.address),
      freshness_score: calculateFreshnessScore(l.datePosted),
      source: "zillow",
    }));
  }

  /**
   * Scrape Craigslist search results
   */
  async scrapeCraigslist(url: string): Promise<ScrapedListing[]> {
    if (!this.page) throw new Error("Browser not initialized");

    // Force list view in URL
    const listUrl = url.includes("?") ? `${url}&view=list` : `${url}#search=1~list~0~0`;

    console.log(`Navigating to: ${listUrl}`);
    await this.page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for page to fully load
    console.log("Waiting for listings to load...");
    await this.page.waitForTimeout(5000);

    // Try clicking list view button if gallery is shown
    try {
      const listBtn = await this.page.$('button[data-mode="list"], .cl-list-view');
      if (listBtn) {
        await listBtn.click();
        await this.page.waitForTimeout(3000);
      }
    } catch {
      // Already in list view or button not found
    }

    // Scroll to trigger lazy loading
    await this.page.evaluate(() => window.scrollBy(0, 500));
    await this.page.waitForTimeout(2000);

    await this.page.screenshot({ path: "craigslist-debug.png" });
    console.log("Screenshot saved to craigslist-debug.png");

    console.log("Extracting listings...");

    const listings = await this.page.evaluate(() => {
      const results: Array<{
        title: string;
        price: string;
        url: string;
        neighborhood: string;
        bedrooms: string;
        datePosted: string;
      }> = [];

      // Craigslist gallery items
      const cards = document.querySelectorAll(".cl-search-result, .result-row, li.cl-static-search-result");

      cards.forEach((card) => {
        try {
          const titleEl = card.querySelector(".titlestring, .result-title, a.posting-title");
          const priceEl = card.querySelector(".priceinfo, .result-price, .price");
          const linkEl = card.querySelector("a.posting-title, a.result-title, a[href*='/apa/']") as HTMLAnchorElement;
          const hoodEl = card.querySelector(".meta .nearby, .result-hood");
          const bedsEl = card.querySelector(".bedrooms, .housing");
          const dateEl = card.querySelector("time, .result-date");

          if (titleEl) {
            results.push({
              title: titleEl.textContent?.trim() || "",
              price: priceEl?.textContent?.trim() || "",
              url: linkEl?.href || "",
              neighborhood: hoodEl?.textContent?.trim().replace(/[()]/g, "") || "",
              bedrooms: bedsEl?.textContent?.trim() || "",
              datePosted: dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "",
            });
          }
        } catch {
          // Skip
        }
      });

      return results;
    });

    console.log(`Found ${listings.length} listings`);

    return listings.map((l) => ({
      address: l.title,
      borough: normalizeBorough(l.neighborhood || l.title),
      neighborhood: l.neighborhood,
      price: cleanPrice(l.price),
      bedrooms: cleanBedrooms(l.bedrooms),
      bathrooms: 1,
      pets: "Unknown",
      original_url: l.url,
      description: l.title,
      vibe_keywords: extractVibeKeywords(l.title),
      freshness_score: calculateFreshnessScore(l.datePosted),
      source: "craigslist",
    }));
  }

  /**
   * Generic scraper for unknown sites
   */
  async scrapeGeneric(url: string): Promise<ScrapedListing[]> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await this.page.waitForTimeout(3000);

    await this.page.screenshot({ path: "scraper-debug.png" });
    console.log("Screenshot saved to scraper-debug.png - check page content");

    return [];
  }
}

// ============================================
// STORAGE
// ============================================

async function saveListings(listings: ScrapedListing[]): Promise<number> {
  if (listings.length === 0) {
    console.log("No listings to save.");
    return 0;
  }

  // Filter valid listings with price > 0
  const valid = listings.filter((l) => l.address && l.price > 0);
  console.log(`Saving ${valid.length} valid listings...`);

  const { data, error } = await supabase
    .from("listings")
    .insert(
      valid.map((l) => ({
        address: l.address,
        borough: l.borough,
        neighborhood: l.neighborhood,
        price: l.price,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        pets: l.pets,
        image_url: l.image_url,
        original_url: l.original_url,
        description: l.description,
        vibe_keywords: l.vibe_keywords,
        freshness_score: l.freshness_score,
        status: "Active",
      }))
    )
    .select("id");

  if (error) {
    console.error("Failed to save:", error.message);
    return 0;
  }

  return data?.length || 0;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.log(`
PEPE 2.0 Enhanced Scraper
=========================

Usage:
  npx tsx scripts/scraper.ts <url>

Examples:
  npx tsx scripts/scraper.ts "https://streeteasy.com/for-rent/nyc/price:-5000"
  npx tsx scripts/scraper.ts "https://www.zillow.com/new-york-ny/rentals/"

Features:
  - Extracts listing data (price, bedrooms, pets, etc.)
  - Detects emotional keywords (light, quiet, cozy, charm)
  - Calculates freshness score (prioritizes new listings)
  - Stores in Supabase 'listings' table
    `);
    return;
  }

  console.log("=".repeat(60));
  console.log("PEPE 2.0 - Enhanced Scraper");
  console.log("=".repeat(60));
  console.log();

  const scraper = new ListingScraper();

  try {
    await scraper.init();

    let listings: ScrapedListing[] = [];

    if (url.includes("streeteasy.com")) {
      listings = await scraper.scrapeStreetEasy(url);
    } else if (url.includes("zillow.com")) {
      listings = await scraper.scrapeZillow(url);
    } else if (url.includes("craigslist.org")) {
      listings = await scraper.scrapeCraigslist(url);
    } else {
      listings = await scraper.scrapeGeneric(url);
    }

    // Display results
    console.log("\nScraped Listings:");
    console.log("-".repeat(40));

    // Sort by freshness (newest first)
    const sorted = [...listings].sort((a, b) => b.freshness_score - a.freshness_score);

    sorted.slice(0, 10).forEach((l, i) => {
      console.log(`${i + 1}. ${l.address}`);
      console.log(`   $${l.price} | ${l.bedrooms}BR | ${l.borough}`);
      console.log(`   Freshness: ${l.freshness_score}/100`);
      if (l.vibe_keywords.length > 0) {
        console.log(`   Vibe: ${l.vibe_keywords.join(", ")}`);
      }
      console.log();
    });

    if (listings.length > 10) {
      console.log(`... and ${listings.length - 10} more\n`);
    }

    // Save to database
    const saved = await saveListings(listings);
    console.log(`Saved ${saved} listings to database.`);
  } catch (error) {
    console.error("Scraper error:", error);
  } finally {
    await scraper.close();
  }

  console.log("\nDone.");
}

main();

/**
 * PEPE 2.0 - Availability Checker
 *
 * This script verifies that listing URLs are still active.
 * If a listing page returns 404 or shows "no longer available",
 * it marks the listing as 'Inactive' in the database.
 *
 * Run: npx tsx scripts/check-availability.ts
 *
 * Recommended: Run twice a week via cron or scheduled task
 * Cron example: 0 6 * * 1,4 npx tsx scripts/check-availability.ts
 */

import { config } from "dotenv";
import { chromium, Browser, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Keywords that indicate a listing is no longer available
const UNAVAILABLE_INDICATORS = [
  "no longer available",
  "listing has been removed",
  "this listing is off the market",
  "property is no longer listed",
  "rental has been rented",
  "sorry, this listing",
  "listing not found",
  "page not found",
  "404",
  "this unit has been rented",
  "off market",
  "removed",
  "expired",
  "taken",
];

interface ListingToCheck {
  id: string;
  address: string;
  original_url: string | null;
  status: string;
}

class AvailabilityChecker {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    console.log("Launching browser (headless mode)...");
    this.browser = await chromium.launch({
      headless: true, // Run silently in background
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
   * Check if a single URL is still available
   */
  async checkUrl(url: string): Promise<{ available: boolean; reason?: string }> {
    if (!this.page) throw new Error("Browser not initialized");
    if (!url) return { available: true, reason: "No URL to check" };

    try {
      const response = await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Check HTTP status
      const status = response?.status() || 0;
      if (status === 404 || status === 410 || status >= 500) {
        return { available: false, reason: `HTTP ${status}` };
      }

      // Wait for page content
      await this.page.waitForTimeout(2000);

      // Check page content for unavailability indicators
      const pageText = await this.page.evaluate(() => {
        return document.body?.innerText?.toLowerCase() || "";
      });

      for (const indicator of UNAVAILABLE_INDICATORS) {
        if (pageText.includes(indicator.toLowerCase())) {
          return { available: false, reason: `Found: "${indicator}"` };
        }
      }

      // Check for redirect to search results (often means listing gone)
      const currentUrl = this.page.url();
      if (
        currentUrl.includes("/search") ||
        currentUrl.includes("/for-rent/") ||
        currentUrl.includes("/results")
      ) {
        // Only flag if we were NOT on a search page to begin with
        if (!url.includes("/search") && !url.includes("/for-rent/nyc")) {
          return { available: false, reason: "Redirected to search results" };
        }
      }

      return { available: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      // Timeout usually means the page is slow, not gone
      if (message.includes("Timeout")) {
        return { available: true, reason: "Timeout (assumed available)" };
      }

      // Navigation errors might mean the site is down or URL is bad
      return { available: false, reason: message };
    }
  }
}

async function getActiveListings(): Promise<ListingToCheck[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, address, original_url, status")
    .eq("status", "Active")
    .not("original_url", "is", null)
    .limit(100); // Process in batches

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    return [];
  }

  return data || [];
}

async function markInactive(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("listings")
    .update({
      status: "Inactive",
      last_checked: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error(`Failed to update listing ${id}:`, error.message);
    return false;
  }
  return true;
}

async function updateLastChecked(id: string): Promise<void> {
  await supabase
    .from("listings")
    .update({ last_checked: new Date().toISOString() })
    .eq("id", id);
}

async function main() {
  console.log("=".repeat(60));
  console.log("PEPE 2.0 - Availability Checker");
  console.log("=".repeat(60));
  console.log();

  // Get all active listings with URLs
  const listings = await getActiveListings();

  if (listings.length === 0) {
    console.log("No active listings with URLs to check.");
    return;
  }

  console.log(`Found ${listings.length} active listings to check.\n`);

  const checker = new AvailabilityChecker();
  await checker.init();

  let checkedCount = 0;
  let inactiveCount = 0;
  let errorCount = 0;

  for (const listing of listings) {
    checkedCount++;
    const progress = `[${checkedCount}/${listings.length}]`;

    if (!listing.original_url) {
      console.log(`${progress} ${listing.address} - No URL, skipping`);
      continue;
    }

    console.log(`${progress} Checking: ${listing.address}`);

    const result = await checker.checkUrl(listing.original_url);

    if (result.available) {
      console.log(`   ✓ Available`);
      await updateLastChecked(listing.id);
    } else {
      console.log(`   ✗ INACTIVE - ${result.reason}`);
      const updated = await markInactive(listing.id);
      if (updated) {
        inactiveCount++;
      } else {
        errorCount++;
      }
    }

    // Small delay between requests to be respectful
    await new Promise((r) => setTimeout(r, 1000));
  }

  await checker.close();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total checked:    ${checkedCount}`);
  console.log(`Still available:  ${checkedCount - inactiveCount - errorCount}`);
  console.log(`Marked inactive:  ${inactiveCount}`);
  console.log(`Errors:           ${errorCount}`);
  console.log("\nDone.");
}

main().catch(console.error);

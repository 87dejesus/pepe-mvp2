/**
 * PEPE 2.0 - Unified Scraper (StreetEasy + Craigslist)
 * Features: Proxy Rotation, User-Agent Rotation, Rate Limiting, Anti-Detection
 */

import { config } from "dotenv";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Proxy config (Bright Data / Oxylabs placeholder)
const PROXY_HOST = process.env.PROXY_HOST || ""; // e.g., "brd.superproxy.io:22225"
const PROXY_USER = process.env.PROXY_USER || "";
const PROXY_PASS = process.env.PROXY_PASS || "";

const BAD_IMAGE_PART = "add7ffb";

// ============================================
// ANTI-DETECTION CONFIG
// ============================================

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
];

const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-US,en;q=0.9,es;q=0.8",
  "en-GB,en;q=0.9,en-US;q=0.8",
  "en-US,en;q=0.8",
];

const REFERERS: Record<string, string[]> = {
  streeteasy: [
    "https://www.google.com/",
    "https://www.bing.com/",
    "https://www.streeteasy.com/",
    "https://duckduckgo.com/",
  ],
  craigslist: [
    "https://www.google.com/",
    "https://www.craigslist.org/",
    "https://newyork.craigslist.org/",
  ],
};

// Rate limiting
const MAX_REQUESTS_PER_HOUR = 60;
const MIN_DELAY_MS = 5000;  // 5 seconds
const MAX_DELAY_MS = 15000; // 15 seconds
const BLOCK_RETRY_DELAY_MS = 60000; // 60 seconds after block
const MAX_RETRIES = 3;

// ============================================
// UTILITIES
// ============================================

const cleanPrice = (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) || 0;

const normalizeBorough = (t: string) => {
  const l = t.toLowerCase();
  if (l.includes("manhattan")) return "Manhattan";
  if (l.includes("brooklyn")) return "Brooklyn";
  if (l.includes("queens")) return "Queens";
  if (l.includes("bronx")) return "Bronx";
  if (l.includes("staten")) return "Staten Island";
  return "Manhattan";
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDelay = (min: number = MIN_DELAY_MS, max: number = MAX_DELAY_MS): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)}s...`);
  return new Promise(resolve => setTimeout(resolve, delay));
};

const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  warn: (msg: string) => console.log(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg: string) => console.log(`[${new Date().toISOString()}] ❌ ${msg}`),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  block: (msg: string) => console.log(`[${new Date().toISOString()}] 🚫 BLOCKED: ${msg}`),
};

// ============================================
// ROBOTS.TXT CHECKER
// ============================================

async function checkRobotsTxt(baseUrl: string, path: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const response = await fetch(robotsUrl);
    if (!response.ok) return true; // No robots.txt = allowed

    const text = await response.text();
    const lines = text.split("\n");
    let isUserAgentMatch = false;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith("user-agent:")) {
        const agent = trimmed.replace("user-agent:", "").trim();
        isUserAgentMatch = agent === "*" || agent.includes("bot");
      }
      if (isUserAgentMatch && trimmed.startsWith("disallow:")) {
        const disallowed = trimmed.replace("disallow:", "").trim();
        if (disallowed && path.startsWith(disallowed)) {
          log.warn(`Path ${path} is disallowed by robots.txt`);
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    log.warn(`Could not fetch robots.txt: ${error}`);
    return true; // Assume allowed if can't fetch
  }
}

// ============================================
// SCRAPER CLASS
// ============================================

class ListingScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private requestCount = 0;
  private hourStart = Date.now();

  private getProxyConfig() {
    if (!PROXY_HOST || !PROXY_USER || !PROXY_PASS) {
      log.warn("No proxy configured - running without proxy (higher block risk)");
      return undefined;
    }
    return {
      server: `http://${PROXY_HOST}`,
      username: PROXY_USER,
      password: PROXY_PASS,
    };
  }

  private getRandomHeaders(source: string) {
    return {
      "User-Agent": randomItem(USER_AGENTS),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": randomItem(ACCEPT_LANGUAGES),
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Referer": randomItem(REFERERS[source] || REFERERS.streeteasy),
    };
  }

  private async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    if (now - this.hourStart >= 3600000) {
      this.requestCount = 0;
      this.hourStart = now;
    }

    if (this.requestCount >= MAX_REQUESTS_PER_HOUR) {
      log.warn(`Rate limit reached (${MAX_REQUESTS_PER_HOUR}/hour). Waiting...`);
      const waitTime = 3600000 - (now - this.hourStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.hourStart = Date.now();
    }

    this.requestCount++;
    return true;
  }

  async init(source: string = "streeteasy") {
    const proxy = this.getProxyConfig();
    const headers = this.getRandomHeaders(source);

    log.info(`Launching browser with UA: ${headers["User-Agent"].substring(0, 50)}...`);

    this.browser = await chromium.launch({
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox",
      ],
    });

    this.context = await this.browser.newContext({
      proxy,
      extraHTTPHeaders: headers,
      viewport: { width: 1366, height: 768 },
      locale: "en-US",
      timezoneId: "America/New_York",
      geolocation: { latitude: 40.7128, longitude: -74.0060 },
      permissions: ["geolocation"],
    });

    // Stealth: Override navigator properties
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });

    this.page = await this.context.newPage();
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  private async handleBlock(attempt: number): Promise<boolean> {
    if (attempt >= MAX_RETRIES) {
      log.error(`Max retries (${MAX_RETRIES}) reached. Aborting.`);
      return false;
    }

    log.block(`Detected block/CAPTCHA. Retry ${attempt + 1}/${MAX_RETRIES} after ${BLOCK_RETRY_DELAY_MS / 1000}s...`);

    // Close and recreate with new identity
    await this.close();
    await new Promise(resolve => setTimeout(resolve, BLOCK_RETRY_DELAY_MS));
    await this.init();

    return true;
  }

  async autoScroll() {
    if (!this.page) return;

    // Human-like scrolling with random pauses
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const maxScroll = 10000;

        const scroll = () => {
          const distance = 100 + Math.floor(Math.random() * 100); // Random 100-200px
          const delay = 50 + Math.floor(Math.random() * 100); // Random 50-150ms

          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= document.body.scrollHeight || totalHeight > maxScroll) {
            resolve();
          } else {
            setTimeout(scroll, delay);
          }
        };

        scroll();
      });
    });

    await this.page.waitForTimeout(1000 + Math.random() * 2000);
  }

  // --- STREETEASY LOGIC ---
  async scrapeStreetEasy(url: string, attempt: number = 0): Promise<any[]> {
    if (!this.page) return [];

    await this.checkRateLimit();

    // Check robots.txt
    const urlObj = new URL(url);
    const allowed = await checkRobotsTxt(urlObj.origin, urlObj.pathname);
    if (!allowed) {
      log.warn("Scraping disallowed by robots.txt. Skipping.");
      return [];
    }

    log.info(`Navigating to StreetEasy: ${url}`);

    try {
      const response = await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Check for blocks
      const status = response?.status() || 0;
      if (status === 403 || status === 429) {
        log.block(`HTTP ${status} received`);
        if (await this.handleBlock(attempt)) {
          return this.scrapeStreetEasy(url, attempt + 1);
        }
        return [];
      }

      // Check for CAPTCHA
      const pageContent = await this.page.content();
      const isBlocked = pageContent.includes("Press & Hold") ||
                        pageContent.includes("captcha") ||
                        pageContent.includes("blocked");

      if (isBlocked) {
        log.warn("⚠️  CAPTCHA DETECTED. Please solve manually in the browser...");
        try {
          await this.page.waitForSelector('[data-testid="listing-card"]', { timeout: 120000 });
          log.success("CAPTCHA solved! Continuing...");
        } catch {
          log.error("CAPTCHA timeout. Retrying with new identity...");
          if (await this.handleBlock(attempt)) {
            return this.scrapeStreetEasy(url, attempt + 1);
          }
          return [];
        }
      }

      // Wait for listings
      await this.page.waitForSelector('[data-testid="listing-card"]', { timeout: 15000 }).catch(() => null);
      await randomDelay(2000, 4000);
      await this.autoScroll();

      const listings = await this.page.evaluate((badImg) => {
        return Array.from(document.querySelectorAll('[data-testid="listing-card"]')).map(card => {
          const img = card.querySelector('img') as HTMLImageElement;
          return {
            address: card.querySelector('[data-testid="listing-address"]')?.textContent?.trim() || "",
            price: card.querySelector('.price')?.textContent?.trim() || "0",
            image_url: img?.srcset?.split(',').pop()?.split(' ')[0] || img?.src || "",
            original_url: (card.querySelector('a') as HTMLAnchorElement)?.href || "",
            source: 'streeteasy'
          };
        }).filter(l => l.image_url && !l.image_url.includes(badImg));
      }, BAD_IMAGE_PART);

      log.success(`Found ${listings.length} listings from StreetEasy`);
      return listings;

    } catch (error: any) {
      log.error(`StreetEasy error: ${error.message}`);
      if (await this.handleBlock(attempt)) {
        return this.scrapeStreetEasy(url, attempt + 1);
      }
      return [];
    }
  }

  // --- CRAIGSLIST LOGIC ---
  async scrapeCraigslist(url: string, attempt: number = 0): Promise<any[]> {
    if (!this.page) return [];

    await this.checkRateLimit();

    // Check robots.txt
    const urlObj = new URL(url);
    const allowed = await checkRobotsTxt(urlObj.origin, urlObj.pathname);
    if (!allowed) {
      log.warn("Scraping disallowed by robots.txt. Skipping.");
      return [];
    }

    log.info(`Navigating to Craigslist: ${url}`);

    try {
      const response = await this.page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Check for blocks
      const status = response?.status() || 0;
      if (status === 403 || status === 429) {
        log.block(`HTTP ${status} received`);
        if (await this.handleBlock(attempt)) {
          return this.scrapeCraigslist(url, attempt + 1);
        }
        return [];
      }

      await randomDelay(2000, 4000);
      await this.autoScroll();

      const listings = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('.cl-search-result')).map(card => {
          const img = card.querySelector('img') as HTMLImageElement;
          return {
            address: card.querySelector('.titlestring')?.textContent?.trim() || "Apartment",
            price: card.querySelector('.priceinfo')?.textContent?.trim() || "0",
            image_url: img?.src || "",
            original_url: (card.querySelector('a') as HTMLAnchorElement)?.href || "",
            source: 'craigslist'
          };
        }).filter(l => l.image_url && l.image_url.length > 0);
      });

      log.success(`Found ${listings.length} listings from Craigslist`);
      return listings;

    } catch (error: any) {
      log.error(`Craigslist error: ${error.message}`);
      if (await this.handleBlock(attempt)) {
        return this.scrapeCraigslist(url, attempt + 1);
      }
      return [];
    }
  }
}

// ============================================
// STORAGE & MAIN
// ============================================

async function save(listings: any[]) {
  const valid = listings.filter(l => cleanPrice(l.price) > 0);
  const unique = Array.from(new Map(valid.map(item => [item.image_url, item])).values());

  if (unique.length === 0) {
    log.warn("No valid listings to save");
    return;
  }

  log.info(`Saving ${unique.length} unique listings to Supabase...`);

  const { error } = await supabase.from("listings").insert(unique.map(l => ({
    address: l.address,
    price: cleanPrice(l.price),
    image_url: l.image_url,
    original_url: l.original_url,
    source: l.source,
    borough: normalizeBorough(l.address),
    status: 'Active'
  })));

  if (error) {
    log.error(`Supabase error: ${error.message}`);
  } else {
    log.success(`Saved ${unique.length} listings successfully`);
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  PEPE SCRAPER v2.0 - Anti-Detection Edition                   ║
╠════════════════════════════════════════════════════════════════╣
║  Usage: npx tsx scripts/scraper.ts <url>                       ║
║                                                                 ║
║  Examples:                                                      ║
║    npx tsx scripts/scraper.ts https://streeteasy.com/...       ║
║    npx tsx scripts/scraper.ts https://newyork.craigslist.org/..║
║                                                                 ║
║  Environment Variables (optional):                              ║
║    PROXY_HOST - Proxy server (e.g., brd.superproxy.io:22225)   ║
║    PROXY_USER - Proxy username                                  ║
║    PROXY_PASS - Proxy password                                  ║
╚════════════════════════════════════════════════════════════════╝
    `);
    return;
  }

  const source = url.includes("streeteasy") ? "streeteasy" : "craigslist";

  log.info(`Starting PEPE Scraper v2.0`);
  log.info(`Source: ${source}`);
  log.info(`Proxy: ${PROXY_HOST ? "Configured" : "Not configured (higher risk)"}`);

  const scraper = new ListingScraper();

  try {
    await scraper.init(source);

    // Random delay before starting
    await randomDelay();

    const data = source === "streeteasy"
      ? await scraper.scrapeStreetEasy(url)
      : await scraper.scrapeCraigslist(url);

    if (data.length > 0) {
      await save(data);
    }

  } catch (error: any) {
    log.error(`Fatal error: ${error.message}`);
  } finally {
    await scraper.close();
    log.info("Scraper finished");
  }
}

main();

/**
 * PEPE 3.0 - Unified NYC Scraper (StreetEasy + Craigslist)
 *
 * Anti-detection: Proxy rotation, 20 updated UAs (Chrome 131+, Firefox 134+),
 * random headers, 5-15s delays, robots.txt compliance, stealth scripts.
 *
 * Usage:
 *   npx tsx scripts/scraper.ts <url>                    # Scrape one URL
 *   npx tsx scripts/scraper.ts --auto                   # Scrape all NYC borough URLs
 *   npx tsx scripts/scraper.ts --auto --source craigslist
 *   npx tsx scripts/scraper.ts --auto --test            # Limit to 10 listings
 *   npx tsx scripts/scraper.ts <url> --headed           # Visible browser (debug)
 *
 * Env vars:
 *   PROXY_URL          - Full proxy URL (http://user:pass@host:port)
 *   PROXY_HOST/USER/PASS - Alternative proxy config
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { config } from "dotenv";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Proxy config - supports PROXY_URL or PROXY_HOST/USER/PASS
const PROXY_URL = process.env.PROXY_URL || "";
const PROXY_HOST = process.env.PROXY_HOST || "";
const PROXY_USER = process.env.PROXY_USER || "";
const PROXY_PASS = process.env.PROXY_PASS || "";

const BAD_IMAGE_PART = "add7ffb";

// CLI flags
const args = process.argv.slice(2);
const isAuto = args.includes("--auto");
const isTest = args.includes("--test");
const isHeaded = args.includes("--headed");
const sourceFlag = args.includes("--source") ? args[args.indexOf("--source") + 1] : null;
const urlArg = args.find(a => a.startsWith("http"));
const TEST_LIMIT = 10;

// ============================================
// NYC BOROUGH URLS
// ============================================

const NYC_URLS: Record<string, Record<string, string>> = {
  streeteasy: {
    manhattan: "https://streeteasy.com/for-rent/manhattan",
    brooklyn: "https://streeteasy.com/for-rent/brooklyn",
    queens: "https://streeteasy.com/for-rent/queens",
    bronx: "https://streeteasy.com/for-rent/the-bronx",
  },
  craigslist: {
    manhattan: "https://newyork.craigslist.org/mnh/apa",
    brooklyn: "https://newyork.craigslist.org/brk/apa",
    queens: "https://newyork.craigslist.org/que/apa",
    bronx: "https://newyork.craigslist.org/brx/apa",
  },
};

// ============================================
// ANTI-DETECTION CONFIG (Updated 2025)
// ============================================

const USER_AGENTS = [
  // Chrome 131-133 (Windows/Mac/Linux)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  // Firefox 134-135
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:134.0) Gecko/20100101 Firefox/134.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0",
  // Safari 18
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  // Edge 131-132
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
  // Opera
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/117.0.0.0",
  // Chrome on Android (mobile viewport diversity)
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
];

const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-US,en;q=0.9,es;q=0.8",
  "en-GB,en;q=0.9,en-US;q=0.8",
  "en-US,en;q=0.8",
  "en-US,en;q=0.9,pt;q=0.7",
  "en,en-US;q=0.9,fr;q=0.7",
];

const REFERERS: Record<string, string[]> = {
  streeteasy: [
    "https://www.google.com/",
    "https://www.google.com/search?q=nyc+apartments+for+rent",
    "https://www.bing.com/",
    "https://www.streeteasy.com/",
    "https://duckduckgo.com/",
    "https://www.reddit.com/r/NYCapartments/",
  ],
  craigslist: [
    "https://www.google.com/",
    "https://www.google.com/search?q=craigslist+nyc+apartments",
    "https://www.craigslist.org/",
    "https://newyork.craigslist.org/",
    "https://duckduckgo.com/",
  ],
};

// Rate limiting - 50 requests/hour per source
const MAX_REQUESTS_PER_HOUR = 50;
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 15000;
const BLOCK_RETRY_DELAY_MS = 60000;
const MAX_RETRIES = 3;

// ============================================
// UTILITIES
// ============================================

const cleanPrice = (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) || 0;

const normalizeBorough = (t: string) => {
  const l = t.toLowerCase();
  if (l.includes("manhattan") || l.includes("midtown") || l.includes("harlem") ||
      l.includes("upper east") || l.includes("upper west") || l.includes("chelsea") ||
      l.includes("soho") || l.includes("tribeca") || l.includes("village") ||
      l.includes("lower east") || l.includes("financial") || l.includes("murray hill") ||
      l.includes("gramercy") || l.includes("hell's kitchen") || l.includes("hells kitchen")) return "Manhattan";
  if (l.includes("brooklyn") || l.includes("williamsburg") || l.includes("bushwick") ||
      l.includes("bed-stuy") || l.includes("park slope") || l.includes("greenpoint") ||
      l.includes("crown heights") || l.includes("flatbush") || l.includes("dumbo") ||
      l.includes("cobble hill") || l.includes("prospect")) return "Brooklyn";
  if (l.includes("queens") || l.includes("astoria") || l.includes("flushing") ||
      l.includes("jamaica") || l.includes("long island city") || l.includes("lic") ||
      l.includes("jackson heights") || l.includes("sunnyside")) return "Queens";
  if (l.includes("bronx") || l.includes("fordham") || l.includes("riverdale") ||
      l.includes("mott haven")) return "Bronx";
  if (l.includes("staten")) return "Staten Island";
  return "Manhattan";
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDelay = (min: number = MIN_DELAY_MS, max: number = MAX_DELAY_MS): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  log.info(`Waiting ${(delay / 1000).toFixed(1)}s...`);
  return new Promise(resolve => setTimeout(resolve, delay));
};

const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] INFO  ${msg}`),
  warn: (msg: string) => console.log(`[${new Date().toISOString()}] WARN  ${msg}`),
  error: (msg: string) => console.log(`[${new Date().toISOString()}] ERROR ${msg}`),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] OK    ${msg}`),
  block: (msg: string) => console.log(`[${new Date().toISOString()}] BLOCK ${msg}`),
};

// ============================================
// ROBOTS.TXT CHECKER
// ============================================

const robotsCache = new Map<string, boolean>();

async function checkRobotsTxt(baseUrl: string, path: string): Promise<boolean> {
  const cacheKey = `${baseUrl}:${path}`;
  if (robotsCache.has(cacheKey)) return robotsCache.get(cacheKey)!;

  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) { robotsCache.set(cacheKey, true); return true; }

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
          log.warn(`Path ${path} is disallowed by robots.txt at ${baseUrl}`);
          robotsCache.set(cacheKey, false);
          return false;
        }
      }
    }
    robotsCache.set(cacheKey, true);
    return true;
  } catch {
    robotsCache.set(cacheKey, true);
    return true;
  }
}

// ============================================
// SCRAPER CLASS
// ============================================

class ListingScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private requestCounts: Record<string, { count: number; hourStart: number }> = {};

  // Stats
  public stats = {
    totalScraped: 0,
    totalSaved: 0,
    totalDuplicates: 0,
    totalBlocked: 0,
    totalErrors: 0,
    sources: {} as Record<string, number>,
  };

  private getProxyConfig() {
    // Support PROXY_URL format: http://user:pass@host:port
    if (PROXY_URL) {
      try {
        const url = new URL(PROXY_URL);
        return {
          server: `${url.protocol}//${url.host}`,
          username: url.username,
          password: url.password,
        };
      } catch {
        log.error(`Invalid PROXY_URL format: ${PROXY_URL}`);
      }
    }

    if (PROXY_HOST && PROXY_USER && PROXY_PASS) {
      return {
        server: `http://${PROXY_HOST}`,
        username: PROXY_USER,
        password: PROXY_PASS,
      };
    }

    log.warn("No proxy configured - running without proxy (higher block risk)");
    return undefined;
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
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": '"Windows"',
      "Referer": randomItem(REFERERS[source] || REFERERS.streeteasy),
    };
  }

  private async checkRateLimit(source: string): Promise<boolean> {
    if (!this.requestCounts[source]) {
      this.requestCounts[source] = { count: 0, hourStart: Date.now() };
    }

    const tracker = this.requestCounts[source];
    const now = Date.now();

    if (now - tracker.hourStart >= 3600000) {
      tracker.count = 0;
      tracker.hourStart = now;
    }

    if (tracker.count >= MAX_REQUESTS_PER_HOUR) {
      const waitTime = 3600000 - (now - tracker.hourStart);
      log.warn(`Rate limit reached for ${source} (${MAX_REQUESTS_PER_HOUR}/hr). Waiting ${Math.ceil(waitTime / 60000)}min...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      tracker.count = 0;
      tracker.hourStart = Date.now();
    }

    tracker.count++;
    log.info(`[${source}] Request ${tracker.count}/${MAX_REQUESTS_PER_HOUR} this hour`);
    return true;
  }

  async init(source: string = "streeteasy") {
    const proxy = this.getProxyConfig();
    const headers = this.getRandomHeaders(source);

    log.info(`Launching browser (headless=${!isHeaded}) UA: ${headers["User-Agent"].substring(0, 60)}...`);

    this.browser = await chromium.launch({
      headless: !isHeaded,
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
      // Hide automation indicators
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission, name: parameters.name, onchange: null } as PermissionStatus)
          : originalQuery(parameters);
    });

    this.page = await this.context.newPage();
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  private async handleBlock(source: string, attempt: number): Promise<boolean> {
    this.stats.totalBlocked++;

    if (attempt >= MAX_RETRIES) {
      log.error(`Max retries (${MAX_RETRIES}) reached for ${source}. Aborting this URL.`);
      return false;
    }

    log.block(`Detected block on ${source}. Retry ${attempt + 1}/${MAX_RETRIES} after ${BLOCK_RETRY_DELAY_MS / 1000}s...`);

    // Close and recreate with new identity (new UA, new proxy session)
    await this.close();
    await new Promise(resolve => setTimeout(resolve, BLOCK_RETRY_DELAY_MS));
    await this.init(source);

    return true;
  }

  async autoScroll() {
    if (!this.page) return;

    await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const maxScroll = 10000;
        const timer = setInterval(() => {
          const distance = 100 + Math.floor(Math.random() * 100);
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight || totalHeight > maxScroll) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100 + Math.floor(Math.random() * 100));
      });
    });

    await this.page.waitForTimeout(1000 + Math.random() * 2000);
  }

  // --- STREETEASY ---
  async scrapeStreetEasy(url: string, attempt: number = 0): Promise<any[]> {
    if (!this.page) return [];

    await this.checkRateLimit("streeteasy");

    const urlObj = new URL(url);
    const allowed = await checkRobotsTxt(urlObj.origin, urlObj.pathname);
    if (!allowed) return [];

    log.info(`Navigating to StreetEasy: ${url}`);

    try {
      const response = await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const status = response?.status() || 0;
      if (status === 403 || status === 429) {
        log.block(`HTTP ${status} from StreetEasy`);
        if (await this.handleBlock("streeteasy", attempt)) {
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
        if (isHeaded) {
          log.warn("CAPTCHA DETECTED. Solve manually in the browser (120s timeout)...");
          try {
            await this.page.waitForSelector('[data-testid="listing-card"]', { timeout: 120000 });
            log.success("CAPTCHA solved! Continuing...");
          } catch {
            log.error("CAPTCHA timeout.");
            if (await this.handleBlock("streeteasy", attempt)) {
              return this.scrapeStreetEasy(url, attempt + 1);
            }
            return [];
          }
        } else {
          log.block("CAPTCHA detected in headless mode. Retrying with new identity...");
          if (await this.handleBlock("streeteasy", attempt)) {
            return this.scrapeStreetEasy(url, attempt + 1);
          }
          return [];
        }
      }

      await this.page.waitForSelector('[data-testid="listing-card"]', { timeout: 15000 }).catch(() => null);
      await randomDelay(2000, 4000);
      await this.autoScroll();

      const listings = await this.page.evaluate((badImg) => {
        return Array.from(document.querySelectorAll('[data-testid="listing-card"]')).map(card => {
          const img = card.querySelector('img') as HTMLImageElement;
          const addressEl = card.querySelector('[data-testid="listing-address"]');
          const priceEl = card.querySelector('.price');
          const linkEl = card.querySelector('a') as HTMLAnchorElement;
          const cardText = card.textContent || '';

          // Extract bedrooms from card text
          const brMatch = cardText.match(/(\d+)\s*(?:bed|br)/i);
          const isStudio = cardText.toLowerCase().includes('studio');
          const bedrooms = brMatch ? parseInt(brMatch[1]) : (isStudio ? 0 : 1);

          // Extract bathrooms
          const baMatch = cardText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba)/i);
          const bathrooms = baMatch ? parseFloat(baMatch[1]) : 1;

          return {
            address: addressEl?.textContent?.trim() || "",
            price: priceEl?.textContent?.trim() || "0",
            image_url: img?.srcset?.split(',').pop()?.split(' ')[0]?.trim() || img?.src || "",
            original_url: linkEl?.href || "",
            bedrooms,
            bathrooms,
            description: cardText.replace(/\s+/g, ' ').trim().slice(0, 400),
            source: 'streeteasy'
          };
        }).filter(l => l.image_url && !l.image_url.includes(badImg) && l.original_url);
      }, BAD_IMAGE_PART);

      this.stats.totalScraped += listings.length;
      this.stats.sources['streeteasy'] = (this.stats.sources['streeteasy'] || 0) + listings.length;
      log.success(`Found ${listings.length} listings from StreetEasy`);
      return listings;

    } catch (error: any) {
      this.stats.totalErrors++;
      log.error(`StreetEasy error: ${error.message}`);
      if (await this.handleBlock("streeteasy", attempt)) {
        return this.scrapeStreetEasy(url, attempt + 1);
      }
      return [];
    }
  }

  // --- CRAIGSLIST ---
  async scrapeCraigslist(url: string, attempt: number = 0): Promise<any[]> {
    if (!this.page) return [];

    await this.checkRateLimit("craigslist");

    const urlObj = new URL(url);
    const allowed = await checkRobotsTxt(urlObj.origin, urlObj.pathname);
    if (!allowed) return [];

    log.info(`Navigating to Craigslist: ${url}`);

    try {
      const response = await this.page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const status = response?.status() || 0;
      if (status === 403 || status === 429) {
        log.block(`HTTP ${status} from Craigslist`);
        if (await this.handleBlock("craigslist", attempt)) {
          return this.scrapeCraigslist(url, attempt + 1);
        }
        return [];
      }

      await this.page.waitForTimeout(3000 + Math.random() * 2000);
      await this.page.waitForSelector('.cl-search-result, .gallery-card, a[href*="/apa/"]', { timeout: 10000 }).catch(() => null);

      await randomDelay(2000, 4000);
      await this.autoScroll();

      const listings = await this.page.evaluate(() => {
        // Method 1: Gallery cards
        let cards = Array.from(document.querySelectorAll('.cl-search-result.gallery-card'));

        // Method 2: Any cl-search-result
        if (cards.length === 0) {
          cards = Array.from(document.querySelectorAll('.cl-search-result'));
        }

        // Method 3: Links fallback
        if (cards.length === 0) {
          const links = Array.from(document.querySelectorAll('a[href*="/apa/"]'));
          return links.slice(0, 50).map(link => {
            const container = link.closest('li') || link.parentElement;
            const img = container?.querySelector('img') as HTMLImageElement;
            const titleText = link.textContent?.trim() || "NYC Apartment";
            const priceEl = container?.querySelector('.priceinfo, .price, [class*="price"]');

            const brMatch = titleText.match(/(\d+)\s*(?:br|bed)/i);
            const isStudio = titleText.toLowerCase().includes('studio');

            return {
              address: titleText,
              price: priceEl?.textContent?.trim() || "0",
              image_url: img?.src || "",
              original_url: (link as HTMLAnchorElement).href,
              bedrooms: brMatch ? parseInt(brMatch[1]) : (isStudio ? 0 : 1),
              bathrooms: 1,
              description: titleText,
              source: 'craigslist'
            };
          }).filter(l => l.original_url);
        }

        return cards.map(card => {
          const img = card.querySelector('img') as HTMLImageElement;
          const link = card.querySelector('a') as HTMLAnchorElement;
          const titleEl = card.querySelector('.titlestring, .title, .posting-title');
          const priceEl = card.querySelector('.priceinfo, .price, .result-price');
          const cardText = card.textContent || '';

          const brMatch = cardText.match(/(\d+)\s*(?:br|bed)/i);
          const isStudio = cardText.toLowerCase().includes('studio');

          return {
            address: titleEl?.textContent?.trim() || "NYC Apartment",
            price: priceEl?.textContent?.trim() || "0",
            image_url: img?.src || "",
            original_url: link?.href || "",
            bedrooms: brMatch ? parseInt(brMatch[1]) : (isStudio ? 0 : 1),
            bathrooms: 1,
            description: cardText.replace(/\s+/g, ' ').trim().slice(0, 400),
            source: 'craigslist'
          };
        }).filter(l => l.original_url);
      });

      this.stats.totalScraped += listings.length;
      this.stats.sources['craigslist'] = (this.stats.sources['craigslist'] || 0) + listings.length;
      log.success(`Found ${listings.length} listings from Craigslist`);
      return listings;

    } catch (error: any) {
      this.stats.totalErrors++;
      log.error(`Craigslist error: ${error.message}`);
      if (await this.handleBlock("craigslist", attempt)) {
        return this.scrapeCraigslist(url, attempt + 1);
      }
      return [];
    }
  }
}

// ============================================
// STORAGE
// ============================================

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

async function save(listings: any[], existingUrls: Set<string>): Promise<number> {
  const valid = listings.filter(l => cleanPrice(l.price) > 0);
  const unique = Array.from(new Map(valid.map(item => [item.original_url, item])).values());

  // Dedup against existing database
  const newListings = unique.filter(l => !existingUrls.has(l.original_url));
  const duplicateCount = unique.length - newListings.length;

  if (duplicateCount > 0) {
    log.info(`Skipped ${duplicateCount} duplicate listings (already in DB)`);
  }

  if (newListings.length === 0) {
    log.warn("No new listings to save (all duplicates)");
    return 0;
  }

  log.info(`Saving ${newListings.length} new listings to Supabase...`);

  const rows = newListings.map(l => ({
    address: l.address,
    neighborhood: l.address,
    borough: normalizeBorough(l.address + ' ' + (l.description || '')),
    price: cleanPrice(l.price),
    bedrooms: l.bedrooms ?? 1,
    bathrooms: l.bathrooms ?? 1,
    description: l.description || '',
    image_url: l.image_url,
    original_url: l.original_url,
    status: 'Active',
    pets: 'Unknown',
  }));

  const { error } = await supabase.from("listings").insert(rows);

  if (error) {
    log.error(`Supabase insert error: ${error.message}`);
    return 0;
  }

  // Add saved URLs to the set so later batches don't re-insert
  newListings.forEach(l => existingUrls.add(l.original_url));
  log.success(`Saved ${newListings.length} listings successfully`);
  return newListings.length;
}

// ============================================
// MAIN
// ============================================

async function main() {
  if (!urlArg && !isAuto) {
    console.log(`
+================================================================+
|  PEPE SCRAPER v3.0 - Anti-Detection NYC Edition                |
+================================================================+
|                                                                |
|  Usage:                                                        |
|    npx tsx scripts/scraper.ts <url>                            |
|    npx tsx scripts/scraper.ts --auto                           |
|    npx tsx scripts/scraper.ts --auto --source craigslist       |
|    npx tsx scripts/scraper.ts --auto --test                    |
|    npx tsx scripts/scraper.ts <url> --headed                   |
|                                                                |
|  Env vars:                                                     |
|    PROXY_URL  - http://user:pass@host:port                     |
|    PROXY_HOST / PROXY_USER / PROXY_PASS                        |
|                                                                |
|  Rate limit: ${MAX_REQUESTS_PER_HOUR} requests/hour per source                    |
+================================================================+
    `);
    return;
  }

  log.info("Starting PEPE Scraper v3.0");
  log.info(`Mode: ${isAuto ? 'auto' : 'single-url'} | Test: ${isTest} | Headed: ${isHeaded}`);
  log.info(`Proxy: ${PROXY_URL || PROXY_HOST ? "Configured" : "Not configured"}`);

  const scraper = new ListingScraper();
  const existingUrls = await getExistingUrls();
  log.info(`Existing listings in DB: ${existingUrls.size}`);

  try {
    if (isAuto) {
      // Auto mode: scrape all borough URLs for selected sources
      const sources = sourceFlag ? [sourceFlag] : ["craigslist", "streeteasy"];

      for (const source of sources) {
        const urls = NYC_URLS[source];
        if (!urls) {
          log.warn(`Unknown source: ${source}`);
          continue;
        }

        log.info(`=== Scraping ${source.toUpperCase()} ===`);
        await scraper.init(source);

        let totalForSource = 0;
        for (const [borough, boroughUrl] of Object.entries(urls)) {
          if (isTest && totalForSource >= TEST_LIMIT) {
            log.info(`Test limit (${TEST_LIMIT}) reached, stopping ${source}`);
            break;
          }

          log.info(`--- ${borough.toUpperCase()} ---`);
          await randomDelay();

          const data = source === "streeteasy"
            ? await scraper.scrapeStreetEasy(boroughUrl)
            : await scraper.scrapeCraigslist(boroughUrl);

          if (data.length > 0) {
            const limited = isTest ? data.slice(0, TEST_LIMIT - totalForSource) : data;
            const savedCount = await save(limited, existingUrls);
            scraper.stats.totalSaved += savedCount;
            scraper.stats.totalDuplicates += limited.length - savedCount;
            totalForSource += limited.length;
          }

          // Inter-borough delay
          await randomDelay(8000, 20000);
        }

        await scraper.close();
      }
    } else {
      // Single URL mode
      const source = urlArg!.includes("streeteasy") ? "streeteasy" : "craigslist";
      await scraper.init(source);
      await randomDelay();

      const data = source === "streeteasy"
        ? await scraper.scrapeStreetEasy(urlArg!)
        : await scraper.scrapeCraigslist(urlArg!);

      if (data.length > 0) {
        const limited = isTest ? data.slice(0, TEST_LIMIT) : data;
        const savedCount = await save(limited, existingUrls);
        scraper.stats.totalSaved += savedCount;
        scraper.stats.totalDuplicates += limited.length - savedCount;
      }

      await scraper.close();
    }
  } catch (error: any) {
    log.error(`Fatal error: ${error.message}`);
  } finally {
    await scraper.close();
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SCRAPER v3.0 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total scraped:    ${scraper.stats.totalScraped}`);
  console.log(`Total saved:      ${scraper.stats.totalSaved}`);
  console.log(`Duplicates:       ${scraper.stats.totalDuplicates}`);
  console.log(`Blocked:          ${scraper.stats.totalBlocked}`);
  console.log(`Errors:           ${scraper.stats.totalErrors}`);
  if (Object.keys(scraper.stats.sources).length > 0) {
    console.log(`By source:        ${JSON.stringify(scraper.stats.sources)}`);
  }
  console.log("=".repeat(60));
}

main();

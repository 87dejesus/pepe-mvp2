'use client';

import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DecisionListingCard from '@/components/DecisionListingCard';
import AffiliateOffers from '@/components/AffiliateOffers';
import Header from '@/components/Header';
import { trialDaysLeft, type AccessState } from '@/lib/access';

const LS_KEY = 'heed_answers_v2';
const DECISIONS_KEY = 'pepe_decisions';

type Answers = {
  boroughs: string[];
  budget: number;
  bedrooms: string;
  bathrooms: string;
  pets: string;
  amenities: string[];
  timing: string;
};

type Listing = {
  id: string;
  neighborhood: string;
  borough: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  image_url: string;
  images: string[];
  pets: string;
  amenities: string[];
  original_url: string | null;
  status: string;
  boroughMatch?: boolean;
};

type Decision = 'applied' | 'wait' | null;

type FilterStats = {
  total: number;
  noUrl: number;
  overBudget: number;
  wrongBedrooms: number;
  wrongBorough: number;
  placeholderImage: number;
  duplicates: number;
  final: number;
  relaxedUsed: boolean;
};

// Non-NYC locations that are hard-rejected for NYC borough preferences
const NON_NYC_LOCATIONS = new Set([
  'jersey city', 'hoboken', 'newark', 'union city', 'weehawken', 'bayonne',
  'secaucus', 'kearny', 'harrison', 'east orange', 'irvington', 'elizabeth',
  'yonkers', 'mount vernon', 'new rochelle', 'white plains',
]);

function isNonNYC(listing: Listing): boolean {
  const borough = (listing.borough || '').toLowerCase().trim();
  const neighborhood = (listing.neighborhood || '').toLowerCase().trim();
  return NON_NYC_LOCATIONS.has(borough) || NON_NYC_LOCATIONS.has(neighborhood);
}

// Borough matching — only checks listing→alias direction to avoid empty-string false positives
function matchesBorough(listing: Listing, boroughs: string[]): boolean {
  // Non-NYC locations never match a NYC borough preference
  if (isNonNYC(listing)) return false;

  const listingBorough = (listing.borough || '').toLowerCase().trim();
  const listingNeighborhood = (listing.neighborhood || '').toLowerCase().trim();

  // No location data — can't confirm a match
  if (!listingBorough && !listingNeighborhood) return false;

  const boroughAliases: Record<string, string[]> = {
    'manhattan': ['manhattan', 'new york', 'nyc', 'midtown', 'upper east side', 'upper west side', 'lower east side', 'lower manhattan', 'harlem', 'east harlem', 'east village', 'west village', 'soho', 'tribeca', 'chelsea', 'gramercy', 'murray hill', "hell's kitchen", 'hells kitchen', 'financial district', 'battery park', 'inwood', 'washington heights', 'morningside heights'],
    'brooklyn': ['brooklyn', 'williamsburg', 'bushwick', 'bed-stuy', 'bedford stuyvesant', 'park slope', 'crown heights', 'greenpoint', 'dumbo', 'prospect heights', 'flatbush', 'bay ridge', 'sunset park', 'cobble hill', 'boerum hill', 'carroll gardens', 'fort greene', 'clinton hill', 'brooklyn heights', 'bensonhurst', 'dyker heights', 'red hook', 'gowanus', 'borough park'],
    'queens': ['queens', 'astoria', 'long island city', 'lic', 'flushing', 'jackson heights', 'forest hills', 'rego park', 'woodside', 'sunnyside', 'elmhurst', 'jamaica', 'ridgewood', 'bayside', 'kew gardens', 'queens village', 'ozone park', 'howard beach', 'corona', 'maspeth', 'middle village', 'richmond hill'],
    'bronx': ['bronx', 'the bronx', 'riverdale', 'fordham', 'pelham', 'mott haven', 'hunts point', 'kingsbridge', 'morris park', 'throgs neck', 'soundview', 'parkchester', 'tremont', 'concourse'],
    'staten island': ['staten island', 'st. george', 'tottenville', 'stapleton', 'richmond', 'new springville'],
  };

  for (const userBorough of boroughs) {
    const key = userBorough.toLowerCase().trim();
    const aliases = boroughAliases[key] || [key];

    for (const alias of aliases) {
      if (alias.length < 3) continue; // skip too-short tokens
      // Check only listing→alias direction to prevent short/empty string false positives
      if (listingBorough.includes(alias) || listingNeighborhood.includes(alias)) {
        return true;
      }
    }
  }
  return false;
}

// Robust price parser — handles number OR string like "$2,500/mo" or "245000"
function parsePrice(p: unknown): number {
  return Number(String(p || 0).replace(/[^0-9.]/g, '')) || 0;
}

// Detect incentives in description
const INCENTIVE_REGEX = /free\s*month|months?\s*free|no\s*fee|no\s*broker|discount|concession|reduced|special\s*offer|move[- ]?in\s*special|net\s*effective|gross\s*rent/i;

function hasIncentives(description: string): boolean {
  return INCENTIVE_REGEX.test(description || '');
}

// Calculate match score (0-100)
// Weights: Borough 40 | Budget 30 | Bedrooms 20 | Pets 5 | Bathroom 3 | Incentive 2
function calculateMatchScore(listing: Listing, answers: Answers): number {
  let score = 0;

  // Borough/Location (40 points) — highest priority
  // Uses precomputed boroughMatch when available, falls back to live check
  const boroughOk = listing.boroughMatch ?? (
    answers.boroughs.length === 0 ? true : matchesBorough(listing, answers.boroughs)
  );
  if (answers.boroughs.length === 0) {
    score += 40; // no preference = full points
  } else if (boroughOk) {
    score += 40;
  }

  // Budget (30 points base + 2 bonus for well under budget)
  const price = parsePrice(listing.price);
  if (price <= answers.budget) {
    score += 30;
    const pctUnder = (answers.budget - price) / answers.budget;
    if (pctUnder > 0.15) score += 2;
  } else {
    const pctOver = (price - answers.budget) / answers.budget;
    score += Math.max(0, Math.round(25 - pctOver * 125));
  }

  // Bedrooms (20 points)
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (answers.bedrooms === '3+') {
    if (listing.bedrooms >= 3) score += 20;
    else if (listing.bedrooms === 2) score += 12;
  } else {
    if (listing.bedrooms === needed) score += 20;
    else if (Math.abs(listing.bedrooms - needed) === 1) score += 12;
  }

  // Pets (5 points)
  if (answers.pets === 'none') {
    score += 5;
  } else if (listing.pets?.toLowerCase() === 'yes') {
    score += 5;
  } else if (listing.pets?.toLowerCase() !== 'no') {
    score += 2; // unknown policy — moderate
  }

  // Bathroom match (3 points)
  const bathMap: Record<string, number> = { '1': 1, '1.5': 1.5, '2+': 2 };
  const neededBath = bathMap[answers.bathrooms] ?? 1;
  if (answers.bathrooms === '2+') {
    if (listing.bathrooms >= 2) score += 3;
    else if (listing.bathrooms >= 1.5) score += 2;
  } else {
    if (listing.bathrooms >= neededBath) score += 3;
  }

  // Incentive bonus (2 points)
  if (hasIncentives(listing.description)) {
    score += 2;
  }

  return Math.min(100, Math.round(score));
}

// Determine recommendation (>80 = ACT NOW)
function getRecommendation(score: number): 'ACT_NOW' | 'WAIT' {
  return score >= 80 ? 'ACT_NOW' : 'WAIT';
}

// Generate warnings for relaxed-match listings
function generateWarnings(listing: Listing, answers: Answers): string[] {
  const warnings: string[] = [];

  if (listing.price > answers.budget) {
    const over = listing.price - answers.budget;
    warnings.push(`$${over.toLocaleString()}/mo over your budget`);
  }

  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (answers.bedrooms === '3+') {
    if (listing.bedrooms < 3) {
      warnings.push(`${listing.bedrooms} bed (you wanted 3+)`);
    }
  } else if (listing.bedrooms !== needed) {
    warnings.push(`${listing.bedrooms} bed (you wanted ${needed})`);
  }

  if (answers.boroughs.length > 0) {
    const boroughOk = listing.boroughMatch ?? matchesBorough(listing, answers.boroughs);
    if (!boroughOk) {
      warnings.push(`Not in your preferred boroughs`);
    }
  }

  return warnings;
}

// ============================================
// MOCK LISTINGS — fallback when Supabase is empty
// ============================================

const MOCK_LISTINGS: Listing[] = [
  {
    id: 'mock-1',
    neighborhood: 'Mott Haven',
    borough: 'Bronx',
    price: 2500,
    bedrooms: 0,
    bathrooms: 1,
    description: '1 month free! Sunny studio in Mott Haven. Modern kitchen, hardwood floors, laundry in building. Pets welcome. Gym on-site. No broker fee.',
    image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'laundry'],
    original_url: 'https://streeteasy.com/mock-1',
    status: 'Active',
  },
  {
    id: 'mock-2',
    neighborhood: 'Fordham',
    borough: 'Bronx',
    price: 2800,
    bedrooms: 1,
    bathrooms: 1,
    description: 'First month free on this bright 1-bed in Fordham. Updated bathroom, open kitchen, pet-friendly building with gym. Close to B/D trains.',
    image_url: 'https://images.unsplash.com/photo-1560448204-e02f11b71c78?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'elevator'],
    original_url: 'https://streeteasy.com/mock-2',
    status: 'Active',
  },
  {
    id: 'mock-3',
    neighborhood: 'Harlem',
    borough: 'Manhattan',
    price: 2750,
    bedrooms: 0,
    bathrooms: 1,
    description: 'Spacious studio in central Harlem — 1 free month, no broker fee. Exposed brick, high ceilings, gym access, pets OK. Near 2/3 subway.',
    image_url: 'https://images.unsplash.com/photo-1502672023-a1a1-4ac7-800b-c8b8e7b96bc7?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'laundry'],
    original_url: 'https://streeteasy.com/mock-3',
    status: 'Active',
  },
  {
    id: 'mock-4',
    neighborhood: 'Washington Heights',
    borough: 'Manhattan',
    price: 3200,
    bedrooms: 1,
    bathrooms: 1,
    description: 'Renovated 1-bedroom in Washington Heights. Net effective rent includes 1 free month. Pets welcome, gym in building, dishwasher, bike storage.',
    image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'dishwasher'],
    original_url: 'https://streeteasy.com/mock-4',
    status: 'Active',
  },
  {
    id: 'mock-5',
    neighborhood: 'Astoria',
    borough: 'Queens',
    price: 2600,
    bedrooms: 0,
    bathrooms: 1,
    description: 'Cozy studio in Astoria — free month on 12-month lease. Newly renovated, pet-friendly, gym included. N/W train, 20 min to Midtown.',
    image_url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym'],
    original_url: 'https://streeteasy.com/mock-5',
    status: 'Active',
  },
  {
    id: 'mock-6',
    neighborhood: 'Long Island City',
    borough: 'Queens',
    price: 3500,
    bedrooms: 1,
    bathrooms: 1,
    description: '1-bed with Manhattan skyline views in LIC. 1 month free, no fee, pet-friendly. Full-service building: gym, rooftop, doorman. E/M/7 trains.',
    image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'doorman', 'outdoor space'],
    original_url: 'https://streeteasy.com/mock-6',
    status: 'Active',
  },
  {
    id: 'mock-7',
    neighborhood: 'Jackson Heights',
    borough: 'Queens',
    price: 2500,
    bedrooms: 0,
    bathrooms: 1,
    description: 'Affordable studio in Jackson Heights — first month free, owner pays broker fee. Pets allowed, gym in building, laundry on-site. 7 train.',
    image_url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'laundry'],
    original_url: 'https://streeteasy.com/mock-7',
    status: 'Active',
  },
  {
    id: 'mock-8',
    neighborhood: 'Riverdale',
    borough: 'Bronx',
    price: 3000,
    bedrooms: 1,
    bathrooms: 1,
    description: 'Large 1-bed in Riverdale with park views. Free month concession on approved credit. Pet-friendly, gym, elevator building. 1 train nearby.',
    image_url: 'https://images.unsplash.com/photo-1549517045-bc93de630f8b?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'elevator'],
    original_url: 'https://streeteasy.com/mock-8',
    status: 'Active',
  },
  {
    id: 'mock-9',
    neighborhood: 'East Harlem',
    borough: 'Manhattan',
    price: 2900,
    bedrooms: 0,
    bathrooms: 1,
    description: 'Sunny studio in East Harlem — reduced first month, no broker fee. Pet-friendly, gym, central air. Close to 6 train and Central Park.',
    image_url: 'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'air conditioning'],
    original_url: 'https://streeteasy.com/mock-9',
    status: 'Active',
  },
  {
    id: 'mock-10',
    neighborhood: 'Sunnyside',
    borough: 'Queens',
    price: 2800,
    bedrooms: 1,
    bathrooms: 1,
    description: '1-bed in Sunnyside Gardens — 1 month free on 12+ month lease. Hardwood floors, updated kitchen, pet-friendly, gym access. 7 train, 25 min to Midtown.',
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    images: [],
    pets: 'yes',
    amenities: ['gym', 'hardwood floors'],
    original_url: 'https://streeteasy.com/mock-10',
    status: 'Active',
  },
];

// ─── Apify data source ────────────────────────────────────────────────────────

// Client-side rental guard — secondary filter after the server already strips
// for-sale items. Catches anything the server-side check misses.
function isRental(listing: Listing): boolean {
  const price = parsePrice(listing.price);
  if (price > 7500) return false;
  const text = (
    (listing.description ?? '') + ' ' +
    (listing.original_url ?? '')
  ).toLowerCase();
  return !text.includes('for sale') && !text.includes('sold') && !text.includes('sale price');
}

// Calls the server-side /api/apify/sync route which fetches from the Apify
// Zillow dataset, normalizes each item, upserts to Supabase, and returns
// the normalized listings to the client.
async function fetchListingsFromApify(): Promise<Listing[]> {
  try {
    const res = await fetch('/api/apify/sync', {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`/api/apify/sync responded ${res.status}`);
    const { listings: raw, synced, dbError } = (await res.json()) as {
      listings: Listing[];
      synced: number;
      dbError: string | null;
    };
    const all = raw ?? [];

    console.log(`[Steady Debug] fetchListingsFromApify: ${all.length} returned, ${synced} saved to DB${dbError ? ` (DB err: ${dbError})` : ''}`);
    console.log(`[DEBUG] First 5 prices from API:`, all.slice(0, 5).map(l => parsePrice(l.price)));
    console.log(`[DEBUG] First 5 descriptions:`, all.slice(0, 5).map(l => (l.description ?? '').slice(0, 60)));

    // Client-side rental filter
    const validRentals = all.filter(isRental);
    console.log(`[DEBUG] Valid rentals after isRental: ${validRentals.length}/${all.length}`);

    if (validRentals.length > 0) return validRentals;

    // Fallback: if all listings failed rental check, show 10 cheapest with a photo
    if (all.length > 0) {
      console.log('[DEBUG] isRental returned 0 — falling back to 10 cheapest with image');
      return all
        .filter(l => l.image_url && l.original_url)
        .sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
        .slice(0, 10);
    }

    return [];
  } catch (err) {
    console.error('[Steady Debug] fetchListingsFromApify failed:', err);
    return [];
  }
}

type DecisionClientProps = {
  subscriptionStatus: string;
  trialEndsAt: string | null;
};

export default function DecisionClient({ subscriptionStatus, trialEndsAt }: DecisionClientProps) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [warningsMap, setWarningsMap] = useState<Record<string, string[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null);

  // Derive accessState from server-provided props (no localStorage needed)
  const accessState: AccessState = {
    status: (subscriptionStatus as AccessState['status']) ?? 'none',
    trial_end: trialEndsAt ?? undefined,
    set_at: new Date().toISOString(),
  };

  // Initialize Supabase client safely
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const client = createClient(url, key);
        setSupabaseClient(client);
      } catch (err) {
        console.error('[Steady Debug] Failed to initialize Supabase:', err);
        setInitError('Failed to connect to database');
        setLoading(false);
      }
    } else {
      console.error('[Steady Debug] Supabase env vars missing:', { url: !!url, key: !!key });
      setInitError('Database configuration missing');
      setLoading(false);
    }
  }, []);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) || localStorage.getItem('steady_answers');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('[Steady Debug] Loaded answers:', parsed);
        setAnswers(parsed);
      } catch {
        console.error('[Steady Debug] Failed to parse answers from localStorage');
      }
    } else {
      console.log('[Steady Debug] No answers found in localStorage');
    }
    const storedDec = localStorage.getItem(DECISIONS_KEY);
    if (storedDec) {
      try {
        setDecisions(JSON.parse(storedDec));
      } catch {
        // ignore
      }
    }
  }, []);

  // Fetch listings
  useEffect(() => {
    if (!answers) return;

    async function fetchData() {
      console.log('[Steady Debug] Fetching listings with answers:', answers);

      // === SOURCE 1: Apify live data (also syncs to Supabase as side-effect) ===
      let rawData: Listing[] = await fetchListingsFromApify();
      let source = 'apify';

      // === SOURCE 2: Supabase fallback (previously synced or scraped data) ===
      if (rawData.length === 0 && supabaseClient) {
        console.log('[Steady Debug] Apify returned 0 — querying Supabase...');
        const { data, error } = await supabaseClient
          .from('listings')
          .select('*')
          .eq('status', 'Active');
        if (error) {
          console.error('[Steady Debug] Supabase error:', error);
        } else if (data && data.length > 0) {
          rawData = data as Listing[];
          source = 'supabase';
        }
      }

      // === SOURCE 3: Mock fallback ===
      if (rawData.length === 0) {
        rawData = MOCK_LISTINGS;
        source = 'mock';
        console.log('[Steady Debug] All sources empty — using 10 mock listings as fallback');
      }
      console.log(`[Steady Debug] Raw listings: ${rawData.length} (source: ${source})`);
      console.log(`Found ${rawData.length} active listings`);
      console.log(`[DEBUG] Raw Apify listings: ${rawData.length}`);
      console.log(`[DEBUG] First 5 prices:`, rawData.slice(0, 5).map(l => parsePrice(l.price)));
      console.log(`[DEBUG] Boroughs found:`, rawData.slice(0, 5).map(l => l.borough || l.neighborhood));

      const stats: FilterStats = {
        total: rawData.length,
        noUrl: 0,
        overBudget: 0,
        wrongBedrooms: 0,
        wrongBorough: 0,
        placeholderImage: 0,
        duplicates: 0,
        final: 0,
        relaxedUsed: false,
      };

      const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
      const needed = bedroomMap[answers!.bedrooms] ?? 1;

      console.log(`[FINAL FILTER] User: budget ${answers!.budget}, boroughs ${answers!.boroughs}, pets ${answers!.pets}`);

      // Helper: check if image is missing or a known placeholder
      const isPlaceholder = (l: Listing) => {
        const img = (l.image_url || l.images?.[0] || '').trim();
        if (!img) return true;
        if (img.includes('add7ffb')) return true;
        if (!img.startsWith('http://') && !img.startsWith('https://')) return true;
        return false;
      };

      // Precompute boroughMatch for every listing once — avoids repeated alias lookups
      const rawWithMatch: Listing[] = rawData.map((l: Listing) => ({
        ...l,
        boroughMatch: answers!.boroughs.length === 0
          ? true
          : matchesBorough(l, answers!.boroughs),
      }));

      // === PASS 1: Strict filters (budget +35%, exact bedrooms, borough required, pets) ===
      const strict = rawWithMatch.filter((l: Listing) => {
        if (!l.original_url) { stats.noUrl++; return false; }
        if (parsePrice(l.price) > answers!.budget * 1.35) { stats.overBudget++; return false; }
        if (answers!.bedrooms === '3+') {
          if (l.bedrooms < 3) { stats.wrongBedrooms++; return false; }
        } else {
          if (l.bedrooms !== needed) { stats.wrongBedrooms++; return false; }
        }
        if (answers!.boroughs.length > 0 && !l.boroughMatch) {
          console.log(`[Heed Debug] Strict rejected borough: "${l.borough}" / "${l.neighborhood}" not in [${answers!.boroughs.join(', ')}]`);
          stats.wrongBorough++; return false;
        }
        // Hard reject if listing explicitly says no pets when user has pets
        if (answers!.pets !== 'none' && l.pets?.toLowerCase() === 'no') { return false; }
        if (isPlaceholder(l)) { stats.placeholderImage++; return false; }
        return true;
      });

      console.log(`After strict filter: ${strict.length}`);
      console.log(`[Heed Debug] Filter breakdown - noUrl: ${stats.noUrl}, overBudget: ${stats.overBudget}, wrongBedrooms: ${stats.wrongBedrooms}, wrongBorough: ${stats.wrongBorough}, placeholder: ${stats.placeholderImage}`);

      let finalList: Listing[] = strict;
      let relaxed: Listing[] = [];

      if (strict.length >= 6) {
        console.log(`[FINAL FILTER] Strict: ${strict.length} | Relaxed: 0 | Showing: ${strict.length}`);
      }

      // === PASS 2: Relaxed filters (when strict < 6) ===
      // Borough becomes optional — but +40pts score bonus keeps borough matches on top
      if (strict.length < 6 && rawWithMatch.length > 0) {
        console.log(`[Heed Debug] Strict returned ${strict.length} (< 6), adding relaxed results (budget +60%, bedrooms ±1, borough optional, non-NYC excluded)...`);
        stats.relaxedUsed = strict.length === 0;

        const strictIds = new Set(strict.map(l => l.id));
        relaxed = rawWithMatch.filter((l: Listing) => {
          if (strictIds.has(l.id)) return false;
          if (!l.original_url) return false;
          if (isPlaceholder(l)) return false;
          // Non-NYC locations never qualify even in relaxed mode
          if (isNonNYC(l)) return false;
          // Budget: allow +60%
          if (parsePrice(l.price) > answers!.budget * 1.60) return false;
          // Bedrooms: flexible — Studio accepts 0 or 1; others allow ±1
          if (answers!.bedrooms === '3+') {
            if (l.bedrooms < 2) return false;
          } else if (answers!.bedrooms === '0') {
            if (l.bedrooms > 1) return false;
          } else {
            if (Math.abs(l.bedrooms - needed) > 1) return false;
          }
          // Borough: optional in relaxed — affects score only, not inclusion
          // Pets: optional in relaxed — affects score only
          return true;
        });

        console.log(`After relaxed filter: ${relaxed.length}`);
        finalList = [...strict, ...relaxed];

        console.log(`[FINAL FILTER] Strict: ${strict.length} | Relaxed: ${relaxed.length} | Showing: ${finalList.length}`);

        // === PASS 3: Last-resort — 10 cheapest listings with a URL and photo ===
        if (finalList.length === 0 && rawWithMatch.length > 0) {
          console.log('[DEBUG] All passes returned 0 — showing 10 cheapest as last resort');
          finalList = rawWithMatch
            .filter(l => l.original_url && !isPlaceholder(l))
            .sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
            .slice(0, 10);
          stats.relaxedUsed = true;
        }
      }

      // Sort by match score DESCENDING
      // Borough is 40pts in score — borough-matched listings naturally float to top
      finalList.sort((a, b) =>
        calculateMatchScore(b, answers!) - calculateMatchScore(a, answers!)
      );

      // Deduplicate by original_url (the actual listing link)
      const seenIds = new Set<string>();
      const seenUrls = new Set<string>();
      const sanitized = finalList
        .map((listing, index) => {
          let uniqueId = listing.id;
          if (!uniqueId || seenIds.has(uniqueId)) {
            uniqueId = `generated-${Date.now()}-${index}`;
          }
          seenIds.add(uniqueId);
          return { ...listing, id: uniqueId };
        })
        .filter((listing) => {
          const url = listing.original_url || '';
          if (!url) return false; // skip listings without a link
          if (seenUrls.has(url)) { stats.duplicates++; return false; }
          seenUrls.add(url);
          return true;
        });

      // Show up to 10 listings (or all if fewer)
      const topN = sanitized.slice(0, 10);
      stats.final = topN.length;
      console.log(`[Heed Debug] Final listings after dedup: ${sanitized.length}, showing ${topN.length}`);
      console.log(`[BOROUGH DEBUG] User chose: ${answers!.boroughs} | Strict borough matches: ${strict.length} | Showing first: ${topN[0]?.borough}`);

      // Generate warnings for each listing
      const warnings: Record<string, string[]> = {};
      topN.forEach(l => {
        warnings[l.id] = generateWarnings(l, answers!);
      });

      setWarningsMap(warnings);
      setFilterStats(stats);
      setListings(topN);
      setLoading(false);
    }
    fetchData();
  // supabaseClient kept in deps so Supabase fallback re-runs if client initializes late
  }, [answers, supabaseClient]);

  // Current listing data
  const currentListing = listings[currentIndex] || null;
  const matchScore = currentListing && answers ? calculateMatchScore(currentListing, answers) : 0;
  const recommendation = getRecommendation(matchScore);
  const currentWarnings = currentListing ? (warningsMap[currentListing.id] || []) : [];

  const saveDecision = (id: string, dec: Decision) => {
    const updated = { ...decisions, [id]: dec };
    setDecisions(updated);
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(updated));
  };

  const handleApply = () => {
    if (!currentListing?.original_url) return;
    saveDecision(currentListing.id, 'applied');
    window.open(currentListing.original_url, '_blank');
  };

  const handleWait = () => {
    if (!currentListing) return;
    saveDecision(currentListing.id, 'wait');
    router.push('/exit');
  };

  const handleNext = () => {
    if (listings.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % listings.length);
    }
  };

  const handlePrev = () => {
    if (listings.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + listings.length) % listings.length);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/70">Finding matches...</p>
          </div>
        </div>
      </div>
    );
  }

  // Init error
  if (initError) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white border-2 border-black p-6">
            <h1 className="text-xl font-bold mb-2">Connection Error</h1>
            <p className="text-gray-500 text-sm mb-6">{initError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#00A651] text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No answers
  if (!answers) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white border-2 border-black p-6">
            <h1 className="text-xl font-bold mb-2">First, tell me what you need</h1>
            <p className="text-gray-500 text-sm mb-6">Answer a few questions so I can find the right matches.</p>
            <Link href="/flow" className="inline-block bg-[#00A651] text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1">
              Start
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No listings — diagnostic empty state
  if (listings.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
        <Header />
        {/* Sub-header with edit link */}
        <div className="shrink-0 px-4 py-2">
          <Link href="/flow" className="text-sm font-bold text-white/80 hover:text-white hover:underline">
            ← EDIT CRITERIA
          </Link>
        </div>

        <div className="flex-1 p-4 pt-2">
          <div className="max-w-lg mx-auto w-full">
            {/* Main no-matches card */}
            <div className="bg-white border-2 border-black p-6 mb-4">
              <div className="flex items-start gap-3 mb-5">
                <img
                  src="/brand/pepe-ny.jpeg"
                  alt="Heed"
                  className="w-12 h-12 rounded-full border-2 border-black object-cover shrink-0"
                />
                <div>
                  <h1 className="text-xl font-bold">No matches right now</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {filterStats?.total === 0
                      ? "The database is empty — listings will appear as they're scraped."
                      : "I couldn't find listings that fit your criteria. Let's figure out why."}
                  </p>
                </div>
              </div>

              {/* Criteria summary */}
              <div className="border-2 border-black p-4 mb-4 bg-gray-50">
                <p className="text-xs font-bold uppercase mb-3">Your criteria</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="border border-gray-300 p-2">
                    <span className="text-xs text-gray-500 block">Budget</span>
                    <span className="font-bold">${answers.budget.toLocaleString()}/mo</span>
                  </div>
                  <div className="border border-gray-300 p-2">
                    <span className="text-xs text-gray-500 block">Bedrooms</span>
                    <span className="font-bold">{answers.bedrooms === '0' ? 'Studio' : answers.bedrooms}</span>
                  </div>
                  <div className="border border-gray-300 p-2 col-span-2">
                    <span className="text-xs text-gray-500 block">Boroughs</span>
                    <span className="font-bold">{answers.boroughs.length > 0 ? answers.boroughs.join(', ') : 'Any'}</span>
                  </div>
                </div>
              </div>

              {/* Filter diagnostic */}
              {filterStats && filterStats.total > 0 && (
                <div className="border-2 border-dashed border-gray-400 p-4 mb-4 text-sm">
                  <p className="text-xs font-bold uppercase mb-2">What happened</p>
                  <p className="text-gray-600">
                    Found <span className="font-bold">{filterStats.total}</span> active listing{filterStats.total !== 1 ? 's' : ''}, but:
                  </p>
                  <ul className="mt-2 space-y-1 text-gray-600 list-disc list-inside">
                    {filterStats.overBudget > 0 && (
                      <li><span className="font-semibold">{filterStats.overBudget}</span> over your ${answers.budget.toLocaleString()} budget</li>
                    )}
                    {filterStats.wrongBedrooms > 0 && (
                      <li><span className="font-semibold">{filterStats.wrongBedrooms}</span> wrong bedroom count</li>
                    )}
                    {filterStats.wrongBorough > 0 && (
                      <li><span className="font-semibold">{filterStats.wrongBorough}</span> not in {answers.boroughs.join('/')}</li>
                    )}
                    {filterStats.noUrl > 0 && (
                      <li><span className="font-semibold">{filterStats.noUrl}</span> had no listing link</li>
                    )}
                    {filterStats.placeholderImage > 0 && (
                      <li><span className="font-semibold">{filterStats.placeholderImage}</span> had no real photos</li>
                    )}
                  </ul>
                  {filterStats.relaxedUsed && (
                    <p className="mt-3 text-xs text-amber-700 font-semibold">
                      Even with relaxed criteria (budget +10%, bedrooms +/-1) — still no matches.
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/flow"
                  className="block text-center bg-[#00A651] text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  Adjust criteria
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="text-center font-bold py-3 px-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  Check again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main view with listings
  const daysLeft = trialDaysLeft(accessState);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
      {/* Trial banner */}
      {accessState.status === 'trialing' && (
        <div className="shrink-0 bg-amber-400 border-b-2 border-black px-3 py-1.5 text-center">
          <p className="text-xs font-bold text-black leading-tight">
            🎉 Trial — {daysLeft}d left · $2.49/wk after
          </p>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/brand/steady-one-white.png" alt="The Steady One" className="w-8 h-8 object-contain" />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/flow" className="text-xs font-bold text-white/70 hover:text-white hover:underline">
            ← EDIT CRITERIA
          </Link>
          <span className="text-sm font-bold text-white">
            {currentIndex + 1} / {listings.length}
            {filterStats?.relaxedUsed && (
              <span className="ml-2 text-xs text-amber-300">(relaxed)</span>
            )}
          </span>
        </div>
      </header>

      {/* Main card area — no justify-center, top-aligned */}
      <main className="flex-1 overflow-auto p-2 sm:p-3 min-h-0" style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
        {currentListing && (
          <div key={currentListing.id} className="max-w-lg mx-auto w-full min-h-[50vh] flex flex-col">
            <DecisionListingCard
              listing={currentListing}
              answers={answers}
              matchScore={matchScore}
              recommendation={recommendation}
              warnings={currentWarnings}
            />
            <AffiliateOffers budget={answers.budget} matchScore={matchScore} />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1E3A8A] border-t-2 border-white/20 px-3 pt-3" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto">
          {/* CTA Buttons */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleApply}
              className={`flex-1 py-3 font-bold border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all ${
                recommendation === 'ACT_NOW'
                  ? 'bg-[#00A651] text-white border-[#00A651]'
                  : 'bg-white text-black border-white'
              }`}
            >
              VIEW FULL LISTING
            </button>
            <button
              onClick={handleWait}
              className={`flex-1 py-3 font-bold border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all ${
                recommendation === 'WAIT'
                  ? 'bg-amber-400 text-black border-amber-400'
                  : 'bg-white/20 text-white border-white/30'
              }`}
            >
              WAIT CONSCIOUSLY
            </button>
          </div>

          {/* Navigation — NEXT is big green primary */}
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className="py-2 px-4 text-sm font-bold border-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2 text-sm font-bold border-2 border-black bg-[#00A651] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              NEXT LISTING →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

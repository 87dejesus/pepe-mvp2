'use client';

import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DecisionListingCard from '@/components/DecisionListingCard';
import Header from '@/components/Header';
import { trialDaysLeft, readAccess, cacheServerAccess, invalidateAccessCache, type AccessState, type AccessStatus } from '@/lib/access';

const ADMIN_EMAIL = 'luhciano.sj@gmail.com';

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
  };

  for (const userBorough of boroughs) {
    const key = userBorough.toLowerCase().trim();
    const aliases = boroughAliases[key] || [key];

    for (const alias of aliases) {
      if (alias.length < 3) continue; // skip too-short tokens
      // Check listing→alias direction to prevent short/empty string false positives
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

// Determine recommendation (>80 = ACT_NOW)
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

    // Client-side rental filter
    const validRentals = all.filter(isRental);
    if (validRentals.length > 0) return validRentals;

    // Fallback: if all listings failed rental check, show 10 cheapest with a photo
    if (all.length > 0) {
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

function DecisionClientInner() {
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

  // ── Admin detection (authenticated via supabase.auth.getUser()) ─────────────
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminBannerDismissed, setAdminBannerDismissed] = useState(false);
  // Server-verified access state + its own "checked" flag (separate from auth)
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessState, setAccessState] = useState<AccessState>({ status: 'none', set_at: '' });
  // True when server returned 'new_user' — needs /paywall routing, not /subscribe
  const [isNewUser, setIsNewUser] = useState(false);

  // Read banner dismiss state from sessionStorage
  useEffect(() => {
    setAdminBannerDismissed(sessionStorage.getItem('heed_banner_dismissed') === 'true');
  }, []);

  // On checkout success, force the access check to hit the server (not stale cache)
  useEffect(() => {
    if (searchParams.get('checkout_success') === '1') {
      invalidateAccessCache();
    }
  }, [searchParams]);

  const isAdmin = authChecked && (userEmail ?? '').toLowerCase().trim() === ADMIN_EMAIL;

  // Initialize Supabase client safely + check admin email
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const client = createBrowserClient(url, key);
        setSupabaseClient(client);
        // Identify admin by authenticated email — requires real Supabase session
        client.auth.getUser()
          .then(({ data: { user }, error }) => {
            console.log('[Steady Debug] getUser result — user:', user?.email ?? null, '| error:', error?.message ?? null);
            setUserEmail(user?.email ?? null);
          })
          .catch((err: unknown) => {
            console.error('[Steady Debug] getUser threw:', err instanceof Error ? err.message : err);
            setUserEmail(null);
          })
          .finally(() => setAuthChecked(true));
      } catch (err) {
        console.error('[Steady Debug] Failed to initialize Supabase:', err);
        setInitError('Failed to connect to database');
        setAuthChecked(true);
        setLoading(false);
      }
    } else {
      console.error('[Steady Debug] Supabase env vars missing:', { url: !!url, key: !!key });
      setInitError('Database configuration missing');
      setAuthChecked(true);
      setLoading(false);
    }
  }, []);

  // ── Server-verified access check ────────────────────────────────────────────
  // Runs after auth resolves. Checks localStorage cache first; falls back to
  // /api/auth/access-status when cache is missing or expired (10-min TTL).
  useEffect(() => {
    if (!authChecked) return;

    // No authenticated user — check for a fresh, server-issued access cache before
    // bouncing to /paywall. getUser() can return null due to transient network errors
    // or an expired access token that couldn't be silently refreshed; a valid cache
    // written seconds ago by post-auth is strong evidence the user is legitimate.
    if (!userEmail) {
      const cached = readAccess();
      const cacheCoversAccess =
        cached.status === 'trialing' ||
        cached.status === 'active' ||
        (cached.status === 'canceled' &&
          cached.current_period_end != null &&
          new Date(cached.current_period_end) > new Date());

      if (cacheCoversAccess) {
        console.log('[Steady Debug] Access gate: getUser() null but fresh cache —', cached.status, '— using as short-lived fallback');
        setAccessState(cached);
        setAccessChecked(true);
        return;
      }

      console.log('[Steady Debug] Access gate: no session + no valid cache — redirecting to /paywall');
      router.replace('/paywall');
      return;
    }

    // Admin — skip server check, grant access immediately
    if ((userEmail ?? '').toLowerCase().trim() === ADMIN_EMAIL) {
      setAccessChecked(true);
      return;
    }

    // Check localStorage cache
    const cached = readAccess();
    if (cached.status !== 'none') {
      console.log('[Steady Debug] Access gate: cache hit —', cached.status);
      setAccessState(cached);
      setAccessChecked(true);
      return;
    }

    // Cache miss or TTL expired — ask the server
    console.log('[Steady Debug] Access gate: cache miss — fetching /api/auth/access-status');
    fetch('/api/auth/access-status')
      .then(async (res) => {
        if (!res.ok) throw new Error(`access-status ${res.status}`);
        return res.json() as Promise<{
          status: string;
          trial_ends_at: string | null;
          current_period_end: string | null;
        }>;
      })
      .then((data) => {
        console.log('[Steady Debug] Access gate: server returned', data.status);

        if (data.status === 'new_user') {
          // Authenticated but no trial row — needs to go through /paywall to start trial
          setIsNewUser(true);
          setAccessState({ status: 'none', set_at: new Date().toISOString() });
          setAccessChecked(true);
          return;
        }

        const serverState = {
          status: data.status as AccessStatus,
          trial_ends_at: data.trial_ends_at,
          current_period_end: data.current_period_end,
        };
        cacheServerAccess(serverState);
        setAccessState({
          status: serverState.status,
          trial_end: data.trial_ends_at ?? undefined,
          current_period_end: data.current_period_end ?? undefined,
          set_at: new Date().toISOString(),
        });
        setAccessChecked(true);
      })
      .catch((err) => {
        // Server check failed — safe default: treat as no access
        console.error('[Steady Debug] Access gate: server check failed:', err);
        setAccessState({ status: 'none', set_at: new Date().toISOString() });
        setAccessChecked(true);
      });
  }, [authChecked, userEmail, router]);

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

  // Fetch listings — only after access is confirmed (prevents loading while gate is pending)
  useEffect(() => {
    if (!accessChecked) return;

    if (!answers) {
      setLoading(false); // no quiz answers — show the "go to /flow" screen
      return;
    }

    async function fetchData() {
      console.log('[Steady Debug] Fetching listings with answers:', answers);

      let rawData: Listing[] = [];
      let source = '';

      // === SOURCE 1: Supabase — instant, uses previously synced data ===
      if (supabaseClient) {
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

      // === SOURCE 2: Apify fallback — live scrape, only if Supabase is empty ===
      if (rawData.length === 0) {
        console.log('[Steady Debug] Supabase returned 0 — fetching from Apify...');
        rawData = await fetchListingsFromApify();
        source = 'apify';
      }

      // === SOURCE 3: Mock fallback ===
      if (rawData.length === 0) {
        rawData = MOCK_LISTINGS;
        source = 'mock';
        console.log('[Steady Debug] All sources empty — using 10 mock listings as fallback');
      }
      console.log(`[Steady Debug] Raw listings: ${rawData.length} (source: ${source})`);

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
      const strictBudgetCap = 1.35;
      const strict = rawWithMatch.filter((l: Listing) => {
        if (!l.original_url) { stats.noUrl++; return false; }
        if (parsePrice(l.price) > answers!.budget * strictBudgetCap) { stats.overBudget++; return false; }
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

        // === PASS 3: Last-resort — 10 cheapest listings matching borough + bedrooms only ===
        if (finalList.length === 0 && rawWithMatch.length > 0) {
          console.log('[DEBUG] All passes returned 0 — showing 10 cheapest by borough + bedrooms as last resort');
          finalList = rawWithMatch
            .filter(l => l.boroughMatch && l.bedrooms === needed)
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

      // Quality check — low count or low avg score means poor matches → show guarantor card
      const avgScore = topN.length > 0
        ? topN.reduce((sum, l) => sum + calculateMatchScore(l, answers!), 0) / topN.length
        : 0;
      const needsGuarantor = topN.length < 6 || avgScore < 75 || answers!.budget < 2800;
      if (needsGuarantor) {
        console.log(`[AFFILIATE] Low budget detected → showing Low-Credit card | listings found: ${topN.length} | avg score: ${Math.round(avgScore)} | budget: $${answers!.budget}`);
      }

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
  }, [answers, supabaseClient, accessChecked]);

  // Current listing data
  const currentListing = listings[currentIndex] || null;
  const matchScore = currentListing && answers ? calculateMatchScore(currentListing, answers) : 0;
  const recommendation = getRecommendation(matchScore);
  const currentWarnings = currentListing ? (warningsMap[currentListing.id] || []) : [];

  // Affiliate logic: force Low-Credit card when results are thin or budget is low
  const avgMatchScore = listings.length > 0 && answers
    ? listings.reduce((sum, l) => sum + calculateMatchScore(l, answers), 0) / listings.length
    : 0;
  const showLowCreditCard = listings.length < 6 || avgMatchScore < 75 || (answers?.budget ?? 9999) < 2800;

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

  async function handleManageSubscription() {
    const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
    const data = await res.json() as { url?: string };
    if (data.url) window.location.href = data.url;
  }

  // Access gate — enforces all access rules after server check completes
  useEffect(() => {
    if (!accessChecked || isAdmin) return;

    const { status, current_period_end } = accessState;

    // Allow: active subscription or valid trial
    if (status === 'trialing' || status === 'active') return;

    // Allow: canceled but within paid grace period
    if (status === 'canceled') {
      const gracePeriodEnd = current_period_end ? new Date(current_period_end) : null;
      if (gracePeriodEnd && gracePeriodEnd > new Date()) return;
      router.replace('/subscribe?reason=canceled');
      return;
    }

    // Block: payment failed — needs to update card
    if (status === 'payment_failed') {
      router.replace('/subscribe?reason=payment_failed');
      return;
    }

    // Block: no access (status === 'none')
    // isNewUser = authenticated but never started trial → /paywall to begin trial
    // otherwise → trial has expired, no subscription → /subscribe
    router.replace(isNewUser ? '/paywall' : '/subscribe?reason=trial_ended');
  }, [accessChecked, isAdmin, accessState, isNewUser, router]);

  // Loading — covers both the access-check phase and the listings-fetch phase
  if (!accessChecked || loading) {
    return (
      <div className="h-[100dvh] flex flex-col bg-[#0A2540]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/50">
              {!accessChecked ? 'Verifying access…' : 'Finding matches…'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Init error
  if (initError) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="max-w-sm w-full bg-white/[0.07] border border-white/20 rounded-2xl p-6">
            <h1 className="text-lg font-semibold text-white mb-2">Connection error</h1>
            <p className="text-white/55 text-sm mb-6 leading-relaxed">{initError}</p>
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-6 rounded-xl bg-[#00A651] text-white font-semibold hover:bg-[#00913f] transition-all"
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
      <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
        <Header />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="max-w-sm w-full bg-white/[0.07] border border-white/20 rounded-2xl p-6">
            <h1 className="text-lg font-semibold text-white mb-2">First, tell me what you need</h1>
            <p className="text-white/55 text-sm mb-6 leading-relaxed">Answer a few questions so I can find the right matches.</p>
            <Link href="/flow" className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[#00A651] text-white font-semibold hover:bg-[#00913f] transition-all">
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
      <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
        <Header />
        <div className="shrink-0 px-5 py-2.5 border-b border-white/10">
          <Link href="/flow" className="text-xs font-medium text-white/50 hover:text-white/80 hover:underline transition-colors">
            ← Edit criteria
          </Link>
        </div>

        <div className="flex-1 p-5">
          <div className="max-w-lg mx-auto w-full">
            <div className="bg-white/[0.07] border border-white/20 rounded-2xl p-6 mb-4">
              <div className="flex items-start gap-3 mb-5">
                <img
                  src="/brand/heed-mascot.png"
                  alt="Heed mascot"
                  width={40}
                  height={40}
                  className="object-contain shrink-0"
                />
                <div>
                  <h1 className="text-lg font-semibold text-white">No matches right now</h1>
                  <p className="text-sm text-white/55 mt-1 leading-relaxed">
                    {filterStats?.total === 0
                      ? "The database is empty — listings will appear as they're scraped."
                      : "I couldn't find listings that fit your criteria. Let's figure out why."}
                  </p>
                </div>
              </div>

              {/* Criteria summary */}
              <div className="bg-white/[0.05] border border-white/15 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/40 mb-3">Your criteria</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/[0.06] rounded-lg p-2.5">
                    <span className="text-[10px] text-white/40 block mb-0.5">Budget</span>
                    <span className="font-semibold text-white">${answers.budget.toLocaleString()}/mo</span>
                  </div>
                  <div className="bg-white/[0.06] rounded-lg p-2.5">
                    <span className="text-[10px] text-white/40 block mb-0.5">Bedrooms</span>
                    <span className="font-semibold text-white">{answers.bedrooms === '0' ? 'Studio' : answers.bedrooms}</span>
                  </div>
                  <div className="bg-white/[0.06] rounded-lg p-2.5 col-span-2">
                    <span className="text-[10px] text-white/40 block mb-0.5">Boroughs</span>
                    <span className="font-semibold text-white">{answers.boroughs.length > 0 ? answers.boroughs.join(', ') : 'Any'}</span>
                  </div>
                </div>
              </div>

              {/* Filter diagnostic */}
              {filterStats && filterStats.total > 0 && (
                <div className="bg-white/[0.05] border border-white/15 rounded-xl p-4 mb-4 text-sm">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/40 mb-2">What happened</p>
                  <p className="text-white/60">
                    Found <span className="font-semibold text-white">{filterStats.total}</span> active listing{filterStats.total !== 1 ? 's' : ''}, but:
                  </p>
                  <ul className="mt-2 space-y-1 text-white/55 list-disc list-inside">
                    {filterStats.overBudget > 0 && (
                      <li><span className="font-medium text-white/80">{filterStats.overBudget}</span> over your ${answers.budget.toLocaleString()} budget</li>
                    )}
                    {filterStats.wrongBedrooms > 0 && (
                      <li><span className="font-medium text-white/80">{filterStats.wrongBedrooms}</span> wrong bedroom count</li>
                    )}
                    {filterStats.wrongBorough > 0 && (
                      <li><span className="font-medium text-white/80">{filterStats.wrongBorough}</span> not in {answers.boroughs.join('/')}</li>
                    )}
                    {filterStats.noUrl > 0 && (
                      <li><span className="font-medium text-white/80">{filterStats.noUrl}</span> had no listing link</li>
                    )}
                    {filterStats.placeholderImage > 0 && (
                      <li><span className="font-medium text-white/80">{filterStats.placeholderImage}</span> had no real photos</li>
                    )}
                  </ul>
                  {filterStats.relaxedUsed && (
                    <p className="mt-3 text-xs text-amber-400/80 font-medium">
                      Even with relaxed criteria (budget +60%, bedrooms ±1) — still no matches.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link
                  href="/flow"
                  className="flex items-center justify-center h-12 rounded-xl bg-[#00A651] text-white font-semibold hover:bg-[#00913f] transition-all"
                >
                  Adjust criteria
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center h-12 rounded-xl bg-white/[0.07] border border-white/20 text-white/75 font-semibold hover:bg-white/[0.11] transition-all"
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
    <div className="h-[100dvh] flex flex-col bg-[#0A2540]">
      {/* Admin banner */}
      {isAdmin && !adminBannerDismissed && (
        <div className="shrink-0 bg-[#00A651]/90 border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-white/90 leading-tight">
            🔧 ADMIN MODE — Full access (Owner only)
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('heed_banner_dismissed', 'true');
              setAdminBannerDismissed(true);
            }}
            className="shrink-0 text-white/60 hover:text-white text-lg leading-none w-5 h-5 flex items-center justify-center"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {/* Trial banner */}
      {accessState.status === 'trialing' && (
        <div className="shrink-0 bg-amber-500/20 border-b border-amber-500/20 px-3 py-1.5 text-center">
          <p className="text-xs font-medium text-amber-300 leading-tight">
            Trial — {daysLeft} days left · $4.49/wk after
          </p>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <img src="/brand/steady-one-white.png" alt="The Steady One" className="w-8 h-8 object-contain" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/flow" className="text-xs font-medium text-white/45 hover:text-white/80 hover:underline transition-colors">
            ← Edit criteria
          </Link>
          <span className="text-sm font-medium text-white/70 tabular-nums">
            {currentIndex + 1} / {listings.length}
            {filterStats?.relaxedUsed && (
              <span className="ml-2 text-xs text-white/35">(relaxed)</span>
            )}
          </span>
          {!isAdmin && (accessState.status === 'active' || accessState.status === 'trialing') && (
            <button
              onClick={handleManageSubscription}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              Manage
            </button>
          )}
        </div>
      </header>

      {/* Main card area */}
      <main className="flex-1 overflow-auto p-3 sm:p-4 min-h-0" style={{ paddingBottom: 'calc(156px + env(safe-area-inset-bottom))' }}>
        {currentListing && (
          <div key={currentListing.id} className="max-w-lg mx-auto w-full flex flex-col">
            <DecisionListingCard
              listing={currentListing}
              answers={answers}
              matchScore={matchScore}
              recommendation={recommendation}
              warnings={currentWarnings}
            />
          </div>
        )}
      </main>

      {/* Fixed bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#071b30] border-t border-white/10 px-3 pt-3"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Primary CTA row */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleApply}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                recommendation === 'ACT_NOW'
                  ? 'bg-[#00A651] text-white hover:bg-[#00913f]'
                  : 'bg-white/[0.12] border border-white/20 text-white hover:bg-white/[0.18]'
              }`}
            >
              See Listing Details
            </button>
            <button
              onClick={handleWait}
              className="flex-1 h-12 rounded-xl font-semibold text-sm bg-white/[0.07] border border-white/15 text-white/65 hover:bg-white/[0.11] hover:text-white/85 transition-all active:scale-[0.98]"
            >
              Maybe Later
            </button>
          </div>

          {/* Prev / Next row */}
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className="h-10 w-12 text-sm font-medium border border-white/15 bg-white/[0.06] text-white/60 rounded-xl hover:bg-white/[0.10] transition-all"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="flex-1 h-10 text-sm font-medium bg-[#00A651] text-white rounded-xl hover:bg-[#00913f] transition-all active:scale-[0.98]"
            >
              Next Listing →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

class DecisionErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Steady] DecisionClient crashed:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] flex flex-col bg-[#0A2540] items-center justify-center px-5">
          <div className="max-w-sm w-full bg-white/[0.07] border border-white/20 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold mb-2">Something went wrong</p>
            <p className="text-white/55 text-sm mb-6 leading-relaxed">
              Reload the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-6 rounded-xl bg-[#00A651] text-white font-semibold hover:bg-[#00913f] transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Public export (wrapped with error boundary) ─────────────────────────────

export default function DecisionClient() {
  return (
    <DecisionErrorBoundary>
      <DecisionClientInner />
    </DecisionErrorBoundary>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DecisionListingCard from '@/components/DecisionListingCard';
import Header from '@/components/Header';

const LS_KEY = 'pepe_answers_v2';
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

// Fuzzy borough matching — bidirectional includes + common aliases
function matchesBorough(listing: Listing, boroughs: string[]): boolean {
  const listingBorough = (listing.borough || '').toLowerCase().trim();
  const listingNeighborhood = (listing.neighborhood || '').toLowerCase().trim();

  // Common aliases: Manhattan is sometimes listed as "New York"
  const boroughAliases: Record<string, string[]> = {
    'manhattan': ['manhattan', 'new york', 'nyc', 'midtown', 'upper east', 'upper west', 'lower east', 'lower manhattan', 'harlem', 'east village', 'west village', 'soho', 'tribeca', 'chelsea', 'gramercy', 'murray hill', 'hells kitchen', "hell's kitchen", 'financial district', 'battery park', 'inwood', 'washington heights'],
    'brooklyn': ['brooklyn', 'williamsburg', 'bushwick', 'bed-stuy', 'bedford stuyvesant', 'park slope', 'crown heights', 'greenpoint', 'dumbo', 'prospect heights', 'flatbush', 'bay ridge', 'sunset park', 'cobble hill', 'boerum hill', 'carroll gardens', 'fort greene', 'clinton hill', 'brooklyn heights', 'bensonhurst', 'dyker heights'],
    'queens': ['queens', 'astoria', 'long island city', 'lic', 'flushing', 'jackson heights', 'forest hills', 'rego park', 'woodside', 'sunnyside', 'elmhurst', 'jamaica', 'ridgewood', 'bayside', 'kew gardens'],
    'bronx': ['bronx', 'the bronx', 'riverdale', 'fordham', 'pelham', 'mott haven', 'hunts point', 'kingsbridge', 'morris park', 'throgs neck'],
    'staten island': ['staten island', 'st. george', 'tottenville'],
  };

  for (const userBorough of boroughs) {
    const key = userBorough.toLowerCase().trim();
    const aliases = boroughAliases[key] || [key];

    for (const alias of aliases) {
      // Check if listing borough/neighborhood contains alias or vice versa
      if (listingBorough.includes(alias) || alias.includes(listingBorough) ||
          listingNeighborhood.includes(alias) || alias.includes(listingNeighborhood)) {
        return true;
      }
    }

    // Also direct partial match: "Brooklyn" in "Brooklyn Heights"
    if (listingBorough.includes(key) || listingNeighborhood.includes(key) ||
        key.includes(listingBorough) || key.includes(listingNeighborhood)) {
      return true;
    }
  }
  return false;
}

// Detect incentives in description
const INCENTIVE_REGEX = /free\s*month|months?\s*free|no\s*fee|no\s*broker|discount|concession|reduced|special\s*offer|move[- ]?in\s*special|net\s*effective|gross\s*rent/i;

function hasIncentives(description: string): boolean {
  return INCENTIVE_REGEX.test(description || '');
}

// Calculate match score (0-100) — balanced scoring
function calculateMatchScore(listing: Listing, answers: Answers): number {
  let score = 0;

  // Budget (35 points base + 5 bonus for under budget)
  if (listing.price <= answers.budget) {
    score += 35;
    const pctUnder = (answers.budget - listing.price) / answers.budget;
    if (pctUnder > 0.05) score += 3;
    if (pctUnder > 0.15) score += 2; // total +5 for >15% under
  } else {
    const pctOver = (listing.price - answers.budget) / answers.budget;
    score += Math.max(0, Math.round(30 - pctOver * 150));
  }

  // Bedrooms (25 points)
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (answers.bedrooms === '3+') {
    if (listing.bedrooms >= 3) score += 25;
    else if (listing.bedrooms === 2) score += 15;
  } else {
    if (listing.bedrooms === needed) score += 25;
    else if (Math.abs(listing.bedrooms - needed) === 1) score += 15;
  }

  // Borough/Location (20 points) — fuzzy matching
  if (answers.boroughs.length > 0) {
    if (matchesBorough(listing, answers.boroughs)) {
      score += 20;
    } else {
      console.log(`[Pepe Debug] Borough mismatch: listing="${listing.borough}/${listing.neighborhood}" vs wanted=[${answers.boroughs.join(',')}]`);
    }
  } else {
    score += 20; // no preference = full points
  }

  // Pets (10 points)
  if (answers.pets === 'none') {
    score += 10;
  } else {
    if (listing.pets?.toLowerCase() === 'yes') score += 10;
    else score += 3; // partial — unknown pet policy
  }

  // Bathroom match (5 points)
  const bathMap: Record<string, number> = { '1': 1, '1.5': 1.5, '2+': 2 };
  const neededBath = bathMap[answers.bathrooms] ?? 1;
  if (answers.bathrooms === '2+') {
    if (listing.bathrooms >= 2) score += 5;
    else if (listing.bathrooms >= 1.5) score += 3;
  } else {
    if (listing.bathrooms >= neededBath) score += 5;
  }

  // Incentive bonus (up to 5 points)
  if (hasIncentives(listing.description)) {
    score += 5;
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
    if (!matchesBorough(listing, answers.boroughs)) {
      warnings.push(`Not in your preferred boroughs`);
    }
  }

  return warnings;
}

export default function DecisionClient() {
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
    const stored = localStorage.getItem(LS_KEY);
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
    if (!answers || !supabaseClient) return;

    async function fetchData() {
      console.log('[Steady Debug] Fetching listings with answers:', answers);

      const { data, error } = await supabaseClient!
        .from('listings')
        .select('*')
        .eq('status', 'Active');

      if (error) {
        console.error('[Steady Debug] Supabase error:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        console.log('[Steady Debug] No data returned from Supabase');
        setLoading(false);
        return;
      }

      console.log(`[Steady Debug] Raw listings from Supabase: ${data.length}`);

      const stats: FilterStats = {
        total: data.length,
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

      // Helper: check if image is a known placeholder
      const isPlaceholder = (l: Listing) => {
        const img = l.image_url || l.images?.[0] || '';
        return img.includes('add7ffb');
      };

      // === PASS 1: Strict filters (budget, bedrooms, borough) ===
      const strict = data.filter((l: Listing) => {
        if (!l.original_url) { stats.noUrl++; return false; }
        if (l.price > answers!.budget) { stats.overBudget++; return false; }
        if (answers!.bedrooms === '3+') {
          if (l.bedrooms < 3) { stats.wrongBedrooms++; return false; }
        } else {
          if (l.bedrooms !== needed) { stats.wrongBedrooms++; return false; }
        }
        if (answers!.boroughs.length > 0) {
          if (!matchesBorough(l, answers!.boroughs)) {
            console.log(`[Pepe Debug] Strict filter rejected borough: "${l.borough}" / "${l.neighborhood}" not in [${answers!.boroughs.join(', ')}]`);
            stats.wrongBorough++; return false;
          }
        }
        if (isPlaceholder(l)) { stats.placeholderImage++; return false; }
        return true;
      });

      console.log(`[Pepe Debug] After strict filters: ${strict.length}`);
      console.log(`[Pepe Debug] Filter breakdown - noUrl: ${stats.noUrl}, overBudget: ${stats.overBudget}, wrongBedrooms: ${stats.wrongBedrooms}, wrongBorough: ${stats.wrongBorough}, placeholder: ${stats.placeholderImage}`);

      let finalList: Listing[] = strict;

      // === PASS 2: Relaxed filters (when strict < 10) ===
      if (strict.length < 10 && data.length > 0) {
        console.log(`[Pepe Debug] Strict returned ${strict.length} (< 10), adding relaxed results (budget +10%, bedrooms ±1, drop borough)...`);
        stats.relaxedUsed = strict.length === 0;

        const strictIds = new Set(strict.map(l => l.id));
        const relaxed = data.filter((l: Listing) => {
          if (strictIds.has(l.id)) return false; // already in strict
          if (!l.original_url) return false;
          if (isPlaceholder(l)) return false;
          // Budget: allow +10%
          if (l.price > answers!.budget * 1.10) return false;
          // Bedrooms: allow +/-1
          if (answers!.bedrooms === '3+') {
            if (l.bedrooms < 2) return false;
          } else {
            if (Math.abs(l.bedrooms - needed) > 1) return false;
          }
          // Borough: drop filter in relaxed mode
          return true;
        });

        console.log(`[Pepe Debug] Relaxed pass found ${relaxed.length} additional listings`);
        // Merge: strict first (already high match), then relaxed
        finalList = [...strict, ...relaxed];
      }

      // Sort by match score (best first), with-photo preferred over no-photo
      finalList.sort((a, b) => {
        const scoreA = calculateMatchScore(a as Listing, answers!);
        const scoreB = calculateMatchScore(b as Listing, answers!);
        // Prefer listings with photos (small tiebreaker)
        const hasImgA = (a.image_url || a.images?.[0]) ? 1 : 0;
        const hasImgB = (b.image_url || b.images?.[0]) ? 1 : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return hasImgB - hasImgA;
      });

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
      console.log(`[Pepe Debug] Final listings after dedup: ${sanitized.length}, showing ${topN.length}`);

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
                  alt="Pepe"
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
  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
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
      <main className="flex-1 overflow-auto p-2 sm:p-3 pb-36 min-h-0">
        {currentListing && (
          <div key={currentListing.id} className="max-w-lg mx-auto w-full min-h-[50vh] flex flex-col">
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

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1E3A8A] border-t-2 border-white/20 px-3 py-3 pb-5">
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

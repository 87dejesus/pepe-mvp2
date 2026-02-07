'use client';

import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import DecisionListingCard from '@/components/DecisionListingCard';

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

// Calculate match score (0-100)
function calculateMatchScore(listing: Listing, answers: Answers): number {
  let score = 0;

  // Budget (40 points max)
  if (listing.price <= answers.budget) {
    const pctUnder = (answers.budget - listing.price) / answers.budget;
    score += 40;
    if (pctUnder > 0.1) score += 5; // Bonus for >10% under
  } else {
    const pctOver = (listing.price - answers.budget) / answers.budget;
    score += Math.max(0, 30 - pctOver * 100);
  }

  // Bedrooms (25 points)
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (answers.bedrooms === '3+') {
    if (listing.bedrooms >= 3) score += 25;
    else if (listing.bedrooms === 2) score += 12;
  } else {
    if (listing.bedrooms === needed) score += 25;
    else if (Math.abs(listing.bedrooms - needed) === 1) score += 12;
  }

  // Borough/Location (25 points)
  if (answers.boroughs.length > 0) {
    const inPreferred = answers.boroughs.some(
      b => (listing.borough || '').toLowerCase().includes(b.toLowerCase()) ||
           (listing.neighborhood || '').toLowerCase().includes(b.toLowerCase())
    );
    if (inPreferred) score += 25;
  } else {
    score += 25;
  }

  // Pets (10 points)
  if (answers.pets === 'none') {
    score += 10;
  } else {
    if (listing.pets?.toLowerCase() === 'yes') score += 10;
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
    const inPreferred = answers.boroughs.some(
      b => (listing.borough || '').toLowerCase().includes(b.toLowerCase()) ||
           (listing.neighborhood || '').toLowerCase().includes(b.toLowerCase())
    );
    if (!inPreferred) {
      warnings.push(`Not in your preferred boroughs`);
    }
  }

  return warnings;
}

export default function DecisionClient() {
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

      // === PASS 1: Strict filters ===
      const strict = data.filter((l: Listing) => {
        if (!l.original_url) { stats.noUrl++; return false; }
        if (l.price > answers!.budget) { stats.overBudget++; return false; }
        if (answers!.bedrooms === '3+') {
          if (l.bedrooms < 3) { stats.wrongBedrooms++; return false; }
        } else {
          if (l.bedrooms !== needed) { stats.wrongBedrooms++; return false; }
        }
        if (answers!.boroughs.length > 0) {
          const match = answers!.boroughs.some(
            b => (l.borough || '').toLowerCase().includes(b.toLowerCase()) ||
                 (l.neighborhood || '').toLowerCase().includes(b.toLowerCase())
          );
          if (!match) { stats.wrongBorough++; return false; }
        }
        const img = l.image_url || l.images?.[0] || '';
        if (img.includes('add7ffb')) { stats.placeholderImage++; return false; }
        return true;
      });

      console.log(`[Steady Debug] After strict filters: ${strict.length}`);
      console.log(`[Steady Debug] Filter breakdown - noUrl: ${stats.noUrl}, overBudget: ${stats.overBudget}, wrongBedrooms: ${stats.wrongBedrooms}, wrongBorough: ${stats.wrongBorough}, placeholder: ${stats.placeholderImage}`);

      let finalList: Listing[] = strict;

      // === PASS 2: Relaxed filters (only if strict returned 0) ===
      if (strict.length === 0 && data.length > 0) {
        console.log('[Steady Debug] Strict filters returned 0, trying relaxed (budget +10%, bedrooms +/-1, any borough)...');
        stats.relaxedUsed = true;

        const relaxed = data.filter((l: Listing) => {
          if (!l.original_url) return false;
          // Budget: allow +10%
          if (l.price > answers!.budget * 1.10) return false;
          // Bedrooms: allow +/-1
          if (answers!.bedrooms === '3+') {
            if (l.bedrooms < 2) return false;
          } else {
            if (Math.abs(l.bedrooms - needed) > 1) return false;
          }
          // Borough: drop filter in relaxed mode
          // Placeholder image filter
          const img = l.image_url || l.images?.[0] || '';
          if (img.includes('add7ffb')) return false;
          return true;
        });

        console.log(`[Steady Debug] After relaxed filters: ${relaxed.length}`);
        finalList = relaxed;
      }

      // Sort by match score (best first)
      finalList.sort((a, b) => {
        const scoreA = calculateMatchScore(a as Listing, answers!);
        const scoreB = calculateMatchScore(b as Listing, answers!);
        return scoreB - scoreA;
      });

      // Deduplicate by id and image
      const seenIds = new Set<string>();
      const seenImageUrls = new Set<string>();
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
          const imageUrl = listing.image_url || listing.images?.[0] || '';
          if (!imageUrl) return true; // Allow listings without images
          if (seenImageUrls.has(imageUrl)) { stats.duplicates++; return false; }
          seenImageUrls.add(imageUrl);
          return true;
        });

      stats.final = sanitized.length;
      console.log(`[Steady Debug] Final listings after dedup: ${sanitized.length}`);

      // Generate warnings for each listing
      const warnings: Record<string, string[]> = {};
      sanitized.forEach(l => {
        warnings[l.id] = generateWarnings(l, answers!);
      });

      setWarningsMap(warnings);
      setFilterStats(stats);
      setListings(sanitized);
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
    if (listings.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % listings.length);
    }
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
      <div className="h-[100dvh] flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Finding matches...</p>
        </div>
      </div>
    );
  }

  // Init error
  if (initError) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-white p-4 pt-8">
        <div className="max-w-lg mx-auto w-full border-2 border-black p-6">
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
    );
  }

  // No answers
  if (!answers) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-white p-4 pt-8">
        <div className="max-w-lg mx-auto w-full border-2 border-black p-6">
          <h1 className="text-xl font-bold mb-2">First, tell me what you need</h1>
          <p className="text-gray-500 text-sm mb-6">Answer a few questions so I can find the right matches.</p>
          <Link href="/flow" className="inline-block bg-[#00A651] text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1">
            Start
          </Link>
        </div>
      </div>
    );
  }

  // No listings — diagnostic empty state
  if (listings.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f5f5f5]">
        {/* Header */}
        <header className="shrink-0 bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between">
          <Link href="/flow" className="text-sm font-bold text-black hover:underline">
            ← EDIT CRITERIA
          </Link>
        </header>

        <div className="flex-1 p-4 pt-6">
          <div className="max-w-lg mx-auto w-full">
            {/* Main no-matches card */}
            <div className="bg-white border-2 border-black p-6 mb-4">
              <div className="flex items-start gap-3 mb-5">
                <img
                  src="/brand/steady-one-blue.png"
                  alt="The Steady One"
                  className="w-12 h-12 border-2 border-black object-cover shrink-0"
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
    <div className="h-[100dvh] flex flex-col bg-[#f5f5f5]">
      {/* Header */}
      <header className="shrink-0 bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between">
        <Link href="/flow" className="text-sm font-bold text-black hover:underline">
          ← EDIT CRITERIA
        </Link>
        <span className="text-sm font-bold text-black">
          {currentIndex + 1} / {listings.length}
          {filterStats?.relaxedUsed && (
            <span className="ml-2 text-xs text-amber-600">(relaxed)</span>
          )}
        </span>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black px-3 py-3 pb-5">
        <div className="max-w-lg mx-auto">
          {/* CTA Buttons */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleApply}
              className={`flex-1 py-3 font-bold border-2 border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all ${
                recommendation === 'ACT_NOW'
                  ? 'bg-[#00A651] text-white'
                  : 'bg-white text-black'
              }`}
            >
              APPLY NOW
            </button>
            <button
              onClick={handleWait}
              className={`flex-1 py-3 font-bold border-2 border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all ${
                recommendation === 'WAIT'
                  ? 'bg-amber-400 text-black'
                  : 'bg-white text-black'
              }`}
            >
              WAIT
            </button>
          </div>

          {/* Navigation — NEXT is big green primary */}
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className="py-2 px-4 text-sm font-bold border-2 border-black bg-white hover:bg-gray-100"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2 text-sm font-bold border-2 border-black bg-[#00A651] text-white shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              NEXT LISTING →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

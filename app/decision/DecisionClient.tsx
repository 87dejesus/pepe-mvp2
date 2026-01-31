'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LS_KEY = 'pepe_answers_v2';
const DECISIONS_KEY = 'pepe_decisions';
const BUILD_VERSION = '2026-01-31-v7'; // Update this to verify deployments

// Placeholder for listings without images
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80';

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
  pets: string; // "Unknown", "Yes", "No" from Supabase
  amenities: string[];
  original_url: string | null;
  status: string;
};

type Decision = 'applied' | 'wait' | null;

type MatchAnalysis = {
  score: number;
  pressureLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  pressureText: string;
  contextLine: string;
  pepeTake: string;
  waitFeedback: string;
  hasRealImage: boolean;
};

function getListingImage(listing: Listing): string {
  // Prioritize image_url (has real images), then images array
  if (listing.image_url) {
    return listing.image_url;
  }
  if (listing.images && listing.images.length > 0 && listing.images[0]) {
    return listing.images[0];
  }
  // Fallback to placeholder
  return PLACEHOLDER_IMAGE;
}

function hasRealImage(listing: Listing): boolean {
  return !!(listing.image_url || (listing.images && listing.images.length > 0 && listing.images[0] && !listing.images[0].includes('placehold')));
}

function formatBedroomText(bedrooms: number): string {
  if (bedrooms === 0) return 'Studio';
  if (bedrooms === 1) return '1 bed';
  return `${bedrooms} beds`;
}

function formatBathroomText(bathrooms: number): string {
  if (bathrooms === 1) return '1 bath';
  return `${bathrooms} baths`;
}

function generateContextLine(listing: Listing, answers: Answers): string {
  const lines: string[] = [];

  if (listing.bedrooms === 0) {
    lines.push('Compact layout, better for one person');
  } else if (listing.bedrooms === 1) {
    lines.push('Space for a couple or solo with a home office');
  } else if (listing.bedrooms >= 2) {
    lines.push('Room for roommates or a growing household');
  }

  const budgetDiff = answers.budget - listing.price;
  if (budgetDiff >= 500) {
    lines.push('leaves breathing room in your budget');
  } else if (budgetDiff < 0) {
    lines.push('stretches your stated budget');
  }

  const petsAllowed = listing.pets?.toLowerCase() === 'yes';
  const petsUnknown = !listing.pets || listing.pets.toLowerCase() === 'unknown';
  if (answers.pets !== 'none' && petsAllowed) {
    lines.push('pet-friendly');
  } else if (answers.pets !== 'none' && petsUnknown) {
    lines.push('pet policy unclear');
  }

  return lines.slice(0, 2).join(', ') + '.';
}

function analyzeMatch(listing: Listing, answers: Answers): MatchAnalysis {
  let score = 50;
  const hasImage = hasRealImage(listing);

  // Budget Analysis
  const budgetDiff = answers.budget - listing.price;
  const budgetPercent = (budgetDiff / answers.budget) * 100;

  if (listing.price <= answers.budget) {
    if (budgetPercent >= 20) score += 20;
    else if (budgetPercent >= 10) score += 15;
    else score += 10;
  } else {
    const overPercent = ((listing.price - answers.budget) / answers.budget) * 100;
    if (overPercent <= 10) score -= 10;
    else score -= 25;
  }

  // Borough Match
  if (answers.boroughs.length > 0) {
    const boroughMatch = answers.boroughs.some(
      b => listing.borough?.toLowerCase().includes(b.toLowerCase()) ||
           listing.neighborhood?.toLowerCase().includes(b.toLowerCase())
    );
    if (boroughMatch) score += 15;
    else score -= 10;
  }

  // Bedrooms Match
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const neededBedrooms = bedroomMap[answers.bedrooms] ?? 1;
  if (listing.bedrooms >= neededBedrooms) score += 10;
  else score -= 15;

  // Bathrooms Match
  const bathroomMap: Record<string, number> = { '1': 1, '1.5': 1.5, '2+': 2 };
  const neededBathrooms = bathroomMap[answers.bathrooms] ?? 1;
  if (listing.bathrooms >= neededBathrooms) score += 5;
  else score -= 5;

  // Pets - check string field from Supabase
  const petsAllowed = listing.pets?.toLowerCase() === 'yes';
  const petsNotAllowed = listing.pets?.toLowerCase() === 'no';
  if (answers.pets !== 'none' && petsNotAllowed) score -= 20;
  else if (answers.pets !== 'none' && petsAllowed) score += 10;

  // Timing urgency bonus
  if (answers.timing === 'asap') score += 5;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Pressure level with human, supportive copy
  let pressureLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  let pressureText: string;

  if (score >= 75) {
    pressureLevel = 'HIGH';
    pressureText = 'This one aligns well with what you shared. Listings like this tend to move quickly in NYC—worth serious consideration.';
  } else if (score >= 55) {
    pressureLevel = 'MEDIUM';
    pressureText = 'A reasonable fit with some tradeoffs. Take your time to think it through.';
  } else {
    pressureLevel = 'LOW';
    pressureText = 'This one has some gaps compared to your criteria. No need to rush.';
  }

  const contextLine = generateContextLine(listing, answers);
  const pepeTake = generatePepeTake(listing, answers, score, hasImage);
  const waitFeedback = generateWaitFeedback(listing, score);

  return { score, pressureLevel, pressureText, contextLine, pepeTake, waitFeedback, hasRealImage: hasImage };
}

function generatePepeTake(
  listing: Listing,
  answers: Answers,
  score: number,
  hasImage: boolean
): string {
  if (!hasImage) {
    return `I'd love to give you a full picture, but this listing doesn't have photos yet. The numbers look reasonable—consider reaching out to request images before deciding.`;
  }

  if (score >= 80) {
    return `This checks your boxes: budget works, location fits, size matches. Apartments like this tend to go quickly, but take the time you need to feel right about it.`;
  } else if (score >= 65) {
    const budgetNote = listing.price <= answers.budget
      ? 'Budget is comfortable.'
      : 'It stretches your budget a bit, which is worth weighing.';
    return `Solid match overall. ${budgetNote} Not perfect, but in NYC, a good fit is often better than waiting for perfect.`;
  } else if (score >= 50) {
    return `Mixed signals here. It works on some levels, not others. Only you know which tradeoffs feel manageable day-to-day.`;
  } else {
    return `This one doesn't quite line up with what you told me matters. The gaps might become daily frustrations.`;
  }
}

function generateWaitFeedback(listing: Listing, score: number): string {
  // Supportive, clear structure: Validation → Clarity → Next step
  if (score >= 75) {
    return `It's okay to pause and think—this is a big decision. Just know that strong matches like this ${formatBedroomText(listing.bedrooms)} in ${listing.neighborhood} at $${listing.price?.toLocaleString()} can get taken quickly. If that happens, we'll keep looking together for something similar.`;
  } else if (score >= 55) {
    return `It's okay to wait on this one. The fit has some gaps, and you deserve to feel confident. Pausing means this specific option might go to someone else—but that's alright. We'll find others that might work better for you.`;
  } else {
    return `Good instinct to pause here. This listing doesn't match your needs closely enough. Your criteria matter—we'll keep looking for something that truly fits.`;
  }
}

export default function DecisionPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [showWaitFeedback, setShowWaitFeedback] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [totalFetched, setTotalFetched] = useState(0);

  // Compute analysis synchronously to avoid race conditions
  const currentItem = listings[currentIndex] || null;
  const analysis = useMemo(() => {
    if (currentItem && answers) {
      return analyzeMatch(currentItem, answers);
    }
    return null;
  }, [currentItem, answers]);

  // Compute image URL synchronously
  const imageUrl = useMemo(() => {
    if (currentItem) {
      return getListingImage(currentItem);
    }
    return PLACEHOLDER_IMAGE;
  }, [currentItem]);

  // Load answers from localStorage
  useEffect(() => {
    console.log('[DecisionClient] Loading answers from localStorage, key:', LS_KEY);
    const stored = localStorage.getItem(LS_KEY);
    console.log('[DecisionClient] Raw stored value:', stored);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('[DecisionClient] Parsed answers:', parsed);
        setAnswers(parsed);
      } catch (e) {
        console.error('[DecisionClient] Failed to parse answers:', e);
      }
    } else {
      console.warn('[DecisionClient] No answers found in localStorage');
    }

    const storedDecisions = localStorage.getItem(DECISIONS_KEY);
    if (storedDecisions) {
      try {
        setDecisions(JSON.parse(storedDecisions));
      } catch (e) {
        console.error('[DecisionClient] Failed to parse decisions:', e);
      }
    }
  }, []);

  // Fetch listings, filter by criteria, and sort by match score
  useEffect(() => {
    // Don't fetch until answers are loaded
    if (!answers) {
      console.log('[DecisionClient] Skipping fetch - answers not loaded yet');
      return;
    }

    const currentAnswers = answers; // TypeScript narrowing
    console.log('[DecisionClient] Fetching listings with answers:', currentAnswers);

    async function fetchListings() {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'Active');

      console.log('[DecisionClient] Supabase response - count:', data?.length, 'error:', error);

      if (data) {
        // Log first listing to see available fields
        if (data.length > 0) {
          console.log('[DecisionClient] Sample listing fields:', Object.keys(data[0]));
          console.log('[DecisionClient] Sample listing original_url:', data[0].original_url);
        }

        // Strict filtering by questionnaire answers
        const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
        const neededBedrooms = bedroomMap[currentAnswers.bedrooms] ?? 1;
        console.log('[DecisionClient] Filter criteria - bedrooms:', currentAnswers.bedrooms, '(need:', neededBedrooms, '), budget:', currentAnswers.budget);

        const filtered = data.filter((listing: Listing) => {
          // CRITICAL: Only show listings with valid application URL
          if (!listing.original_url) return false;

          // Bedroom filter: exact match for studio/1/2, or >= for 3+
          if (currentAnswers.bedrooms === '3+') {
            if (listing.bedrooms < 3) return false;
          } else {
            if (listing.bedrooms !== neededBedrooms) return false;
          }

          // Budget filter: allow up to 10% over budget
          const maxPrice = currentAnswers.budget * 1.1;
          if (listing.price > maxPrice) return false;

          return true;
        });

        const withUrl = data.filter((l: Listing) => l.original_url);
        console.log('[DecisionClient] Listings with URL:', withUrl.length, 'of', data.length);
        console.log('[DecisionClient] After all filters:', filtered.length, 'listings');

        // Sort filtered listings by match score
        const sorted = filtered.sort((a, b) => {
          const scoreA = analyzeMatch(a, currentAnswers).score;
          const scoreB = analyzeMatch(b, currentAnswers).score;
          return scoreB - scoreA;
        });

        setTotalFetched(data.length);
        setListings(sorted);
      }
      setLoading(false);
    }
    fetchListings();
  }, [answers]);

  // Reset UI state when listing changes
  useEffect(() => {
    setShowWaitFeedback(false);
    setShowDetails(false);
  }, [currentIndex]);

  const saveDecision = (listingId: string, decision: Decision) => {
    const updated = { ...decisions, [listingId]: decision };
    setDecisions(updated);
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(updated));
  };

  const handleTakeStep = () => {
    if (!currentItem || !currentItem.original_url) return;
    saveDecision(currentItem.id, 'applied');
    window.open(currentItem.original_url, '_blank');
  };

  const handleWait = () => {
    if (currentItem) {
      saveDecision(currentItem.id, 'wait');
      router.push('/exit?choice=wait');
    }
  };

  const handleNext = () => {
    setShowWaitFeedback(false);
    setShowDetails(false);
    // Allow going past last listing to show "end of matches" state
    if (currentIndex < listings.length) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Check if we've seen all listings
  const isLastListing = currentIndex >= listings.length - 1;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Finding your matches...</p>
        </div>
      </div>
    );
  }

  // No answers
  if (!answers) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold mb-2">First, tell me what you need</h1>
          <p className="text-gray-500 text-sm mb-6">
            I need your criteria to find the right matches.
          </p>
          <Link
            href="/flow"
            className="inline-block bg-[#00A651] text-white font-medium py-3 px-6 rounded-lg"
          >
            Start Questionnaire
          </Link>
        </div>
      </div>
    );
  }

  // No listings matching criteria
  if (listings.length === 0) {
    const bedroomLabel = answers.bedrooms === '0' ? 'Studio' :
                         answers.bedrooms === '1' ? '1 bedroom' :
                         answers.bedrooms === '2' ? '2 bedrooms' : '3+ bedrooms';
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <img
            src="/brand/pepe-ny.jpeg"
            alt="Pepe"
            className="w-20 h-20 rounded-full object-cover border-3 border-[#00A651] mx-auto mb-4"
          />
          <h1 className="text-xl font-semibold mb-2">No matches right now</h1>
          <p className="text-gray-500 text-sm mb-4">
            I couldn't find available listings that match:
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left text-sm">
            <div className="text-gray-600">
              <span className="font-medium">Type:</span> {bedroomLabel}
            </div>
            <div className="text-gray-600">
              <span className="font-medium">Budget:</span> up to ${Math.round(answers.budget * 1.1).toLocaleString()}/mo
            </div>
            {totalFetched > 0 && (
              <div className="text-gray-400 text-xs mt-2">
                ({totalFetched} total listings checked)
              </div>
            )}
          </div>
          <p className="text-gray-400 text-xs mb-6">
            Try adjusting bedroom type or increasing budget, then check back.
          </p>
          <div className="space-y-3">
            <Link
              href="/flow"
              className="block w-full bg-[#00A651] text-white font-medium py-3 px-6 rounded-lg"
            >
              Adjust my criteria
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="block w-full bg-gray-100 text-gray-600 font-medium py-3 px-6 rounded-lg"
            >
              Check again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // End of matches state - user has seen all listings
  if (currentIndex >= listings.length) {
    const bedroomLabel = answers.bedrooms === '0' ? 'Studio' :
                         answers.bedrooms === '1' ? '1 bedroom' :
                         answers.bedrooms === '2' ? '2 bedrooms' : '3+ bedrooms';
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <img
            src="/brand/pepe-ny.jpeg"
            alt="Pepe"
            className="w-20 h-20 rounded-full object-cover border-3 border-[#00A651] mx-auto mb-4"
          />
          <h1 className="text-xl font-semibold mb-2">You've seen all matches</h1>
          <p className="text-gray-500 text-sm mb-4">
            That's everything I found for your criteria right now.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left text-sm">
            <div className="text-gray-600">
              <span className="font-medium">Type:</span> {bedroomLabel}
            </div>
            <div className="text-gray-600">
              <span className="font-medium">Budget:</span> up to ${Math.round(answers.budget * 1.1).toLocaleString()}/mo
            </div>
            <div className="text-gray-400 text-xs mt-2">
              {listings.length} listing{listings.length !== 1 ? 's' : ''} reviewed
            </div>
          </div>
          <div className="space-y-3">
            <Link
              href="/flow"
              className="block w-full bg-[#00A651] text-white font-medium py-3 px-6 rounded-lg"
            >
              Adjust my criteria
            </Link>
            <Link
              href="/exit?choice=wait"
              className="block w-full bg-gray-100 text-gray-600 font-medium py-3 px-6 rounded-lg"
            >
              Come back later
            </Link>
            <button
              onClick={() => setCurrentIndex(0)}
              className="block w-full text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Review listings again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentDecision = decisions[currentItem?.id];

  // Debug current listing and image
  console.log('[DecisionClient] Render - index:', currentIndex, 'id:', currentItem?.id, 'price:', currentItem?.price, 'image_url:', currentItem?.image_url?.slice(-20), 'computed imageUrl:', imageUrl?.slice(-20));

  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* TEMP DEBUG BANNER - REMOVE AFTER CONFIRMING DEPLOY */}
      <div className="bg-red-600 text-white text-center py-2 text-xs font-mono">
        BUILD: {BUILD_VERSION} | Answers: {answers ? 'YES' : 'NO'} | Listings: {listings.length} | Analysis: {analysis ? 'YES' : 'NO'}
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <Link href="/flow" className="text-sm text-gray-400 hover:text-gray-600">
          ← Edit criteria
        </Link>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-sm text-gray-500"
        >
          {currentIndex + 1} of {listings.length}
        </button>
      </header>

      {/* Debug Panel - Click counter to toggle */}
      {showDebug && (
        <div className="bg-gray-900 text-green-400 p-3 text-xs font-mono">
          <div><strong>Debug Info</strong> (build: {BUILD_VERSION})</div>
          <div>Answers loaded: {answers ? 'YES' : 'NO'}</div>
          {answers && (
            <>
              <div>- bedrooms: {answers.bedrooms}</div>
              <div>- budget: ${answers.budget}</div>
              <div>- boroughs: {answers.boroughs.join(', ')}</div>
            </>
          )}
          <div>Total fetched: {totalFetched}</div>
          <div>After filter: {listings.length}</div>
          <div>Current item original_url: {currentItem?.original_url || 'NULL'}</div>
          <div>Current item price: ${currentItem?.price}</div>
          <div>Current item bedrooms: {currentItem?.bedrooms}</div>
          <div>Image URL: {imageUrl?.slice(-30)}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 pb-36">

          {/* Listing Card - key forces re-render on item change */}
          <div key={currentItem.id} className="bg-white rounded-xl overflow-hidden shadow-sm">

            {/* Image */}
            <div className="relative aspect-[4/3]">
              <img
                key={`img-${currentItem.id}`}
                src={imageUrl}
                alt={`${currentItem?.neighborhood || 'Listing'}`}
                className="w-full h-full object-cover"
              />

              {/* Placeholder indicator */}
              {!analysis?.hasRealImage && (
                <div className="absolute top-3 left-3 bg-gray-800/70 text-white text-xs px-2 py-1 rounded">
                  Photo pending
                </div>
              )}

              {/* Price Badge */}
              <div className="absolute bottom-3 left-3 bg-[#00A651] text-white font-semibold px-3 py-1.5 rounded-lg text-base">
                ${currentItem?.price?.toLocaleString()}/mo
              </div>

              {/* Decision Badge */}
              {currentDecision && (
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-lg text-sm font-medium ${
                  currentDecision === 'applied'
                    ? 'bg-[#00A651] text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentDecision === 'applied' ? 'Step taken' : 'Waiting'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              {/* Location */}
              <h1 className="text-lg font-semibold text-gray-900">
                {currentItem?.neighborhood}
                {currentItem?.borough && currentItem.borough !== currentItem.neighborhood && (
                  <span className="text-gray-400 font-normal"> · {currentItem.borough}</span>
                )}
              </h1>

              {/* Specs */}
              <p className="text-sm text-gray-500 mt-1">
                {formatBedroomText(currentItem?.bedrooms)} · {formatBathroomText(currentItem?.bathrooms)}
                {currentItem?.pets?.toLowerCase() === 'yes' && ' · Pets OK'}
              </p>

              {/* Context Line */}
              {analysis && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  {analysis.contextLine}
                </p>
              )}

              {/* Pressure Level */}
              {analysis && (
                <div className={`mt-4 rounded-lg p-3 ${
                  analysis.pressureLevel === 'HIGH'
                    ? 'bg-emerald-50'
                    : analysis.pressureLevel === 'MEDIUM'
                    ? 'bg-amber-50'
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      analysis.pressureLevel === 'HIGH'
                        ? 'text-emerald-600'
                        : analysis.pressureLevel === 'MEDIUM'
                        ? 'text-amber-600'
                        : 'text-gray-500'
                    }`}>
                      {analysis.pressureLevel === 'HIGH' ? 'Strong match' :
                       analysis.pressureLevel === 'MEDIUM' ? 'Worth considering' : 'Keep looking'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{analysis.score}% match</span>
                  </div>
                  <p className={`text-sm ${
                    analysis.pressureLevel === 'HIGH'
                      ? 'text-emerald-700'
                      : analysis.pressureLevel === 'MEDIUM'
                      ? 'text-amber-700'
                      : 'text-gray-600'
                  }`}>
                    {analysis.pressureText}
                  </p>
                </div>
              )}

              {/* Pepe's Take - With real Pepe image */}
              {analysis && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <img
                      src="/brand/pepe-ny.jpeg"
                      alt="Pepe"
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#00A651] shrink-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#00A651] uppercase tracking-wide mb-1">
                        Pepe's take
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {analysis.pepeTake}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              {showDetails && currentItem?.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Details
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {currentItem.description}
                  </p>
                  {currentItem?.original_url && (
                    <a
                      href={currentItem.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm font-medium text-[#00A651] hover:underline"
                    >
                      View original listing →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Wait Feedback */}
          {showWaitFeedback && analysis && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                Decision noted
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                {analysis.waitFeedback}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Fixed Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6">
        <div className="max-w-md mx-auto space-y-3">

          {/* Primary Actions Row */}
          <div className="flex gap-2">
            <button
              onClick={handleTakeStep}
              className={`flex-1 py-3.5 rounded-xl font-semibold transition-all ${
                currentDecision === 'applied'
                  ? 'bg-[#00A651]/20 text-[#00A651]'
                  : 'bg-[#00A651] text-white active:scale-[0.98]'
              }`}
            >
              {currentDecision === 'applied' ? 'Applied' : 'Apply now'}
            </button>

            <button
              onClick={handleWait}
              disabled={currentDecision === 'wait'}
              className={`flex-1 py-3.5 rounded-xl font-semibold transition-all ${
                currentDecision === 'wait'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-amber-400 text-amber-900 active:scale-[0.98]'
              }`}
            >
              {currentDecision === 'wait' ? 'Waiting' : 'Wait consciously'}
            </button>
          </div>

          {/* Microcopy */}
          <p className="text-xs text-gray-400 text-center">
            You're not committing yet. You're keeping this option alive.
          </p>

          {/* Navigation - Secondary, much smaller */}
          {isLastListing ? (
            <Link
              href="/flow"
              className="block w-full py-1.5 text-xs text-center text-[#00A651] hover:underline transition-colors"
            >
              End of matches · Adjust criteria
            </Link>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip to next →
            </button>
          )}

        </div>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  images: string[];
  pets_allowed: boolean;
  amenities: string[];
  url: string;
  status: string;
};

type Decision = 'applied' | 'wait' | null;

type MatchAnalysis = {
  score: number;
  pressureLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  pressureText: string;
  contextLine: string;
  pepeTake: string;
  waitTradeoff: string;
  hasImage: boolean;
};

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

  // Size context
  if (listing.bedrooms === 0) {
    lines.push('Compact layout, better for one person');
  } else if (listing.bedrooms === 1) {
    lines.push('Space for a couple or solo with a home office');
  } else if (listing.bedrooms >= 2) {
    lines.push('Room for roommates or a growing household');
  }

  // Budget context
  const budgetDiff = answers.budget - listing.price;
  if (budgetDiff >= 500) {
    lines.push('leaves breathing room in your budget');
  } else if (budgetDiff < 0) {
    lines.push('stretches your stated budget');
  }

  // Pet context
  if (answers.pets !== 'none' && listing.pets_allowed) {
    lines.push('pet-friendly');
  } else if (answers.pets !== 'none' && !listing.pets_allowed) {
    lines.push('pet policy unclear');
  }

  return lines.slice(0, 2).join(', ') + '.';
}

function analyzeMatch(listing: Listing, answers: Answers): MatchAnalysis {
  let score = 50;
  const hasImage = !!(listing.images && listing.images.length > 0 && listing.images[0]);

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

  // Pets
  if (answers.pets !== 'none' && !listing.pets_allowed) score -= 20;
  else if (answers.pets !== 'none' && listing.pets_allowed) score += 10;

  // Timing urgency bonus
  if (answers.timing === 'asap') score += 5;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine pressure level
  let pressureLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  let pressureText: string;

  if (score >= 75) {
    pressureLevel = 'HIGH';
    pressureText = 'This matches what you told me matters. In NYC, listings like this move fast.';
  } else if (score >= 55) {
    pressureLevel = 'MEDIUM';
    pressureText = 'Decent fit, but there are tradeoffs. Take your time to weigh them.';
  } else {
    pressureLevel = 'LOW';
    pressureText = 'This one has gaps. No rush here.';
  }

  // Generate context line
  const contextLine = generateContextLine(listing, answers);

  // Generate Pepe's Take
  const pepeTake = generatePepeTake(listing, answers, score, hasImage);

  // Generate Wait Tradeoff text
  const waitTradeoff = generateWaitTradeoff(listing, score);

  return { score, pressureLevel, pressureText, contextLine, pepeTake, waitTradeoff, hasImage };
}

function generatePepeTake(
  listing: Listing,
  answers: Answers,
  score: number,
  hasImage: boolean
): string {
  if (!hasImage) {
    return `I can't fully assess this one without seeing it. The numbers work, but photos matter. Proceed with caution or request images before deciding.`;
  }

  if (score >= 80) {
    return `This checks your boxes. Budget works, location fits, size matches. Apartments like this don't wait around in this market.`;
  } else if (score >= 65) {
    const budgetNote = listing.price <= answers.budget
      ? 'Budget is comfortable.'
      : 'It stretches your budget, but might be worth it.';
    return `Solid match overall. ${budgetNote} Not perfect, but in NYC, "good enough" often is.`;
  } else if (score >= 50) {
    return `Mixed signals here. It works on some levels, not others. Only you know which tradeoffs you can live with.`;
  } else {
    return `This one doesn't line up with what you told me. The gaps would likely frustrate you daily.`;
  }
}

function generateWaitTradeoff(listing: Listing, score: number): string {
  if (score >= 75) {
    return `You're choosing to let this one go for now. That's valid—but know that someone else might act on it today. If it disappears, you'll need to find another ${formatBedroomText(listing.bedrooms)} in ${listing.neighborhood} under $${listing.price?.toLocaleString()}.`;
  } else if (score >= 55) {
    return `Waiting makes sense here. The fit isn't strong enough to rush. But remember: in NYC, "perfect" rarely shows up. You're trading this certainty for the hope of something better.`;
  } else {
    return `Good instinct. This listing doesn't match what you need. Your criteria exist for a reason—trust them and keep looking.`;
  }
}

export default function DecisionPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [showWaitConfirm, setShowWaitConfirm] = useState(false);

  // Load answers from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        setAnswers(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse answers:', e);
      }
    }

    // Load previous decisions
    const storedDecisions = localStorage.getItem(DECISIONS_KEY);
    if (storedDecisions) {
      try {
        setDecisions(JSON.parse(storedDecisions));
      } catch (e) {
        console.error('Failed to parse decisions:', e);
      }
    }
  }, []);

  // Fetch listings and sort by match score
  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'Active');

      if (data && answers) {
        const sorted = [...data].sort((a, b) => {
          const scoreA = analyzeMatch(a, answers).score;
          const scoreB = analyzeMatch(b, answers).score;
          return scoreB - scoreA;
        });
        setListings(sorted);
      } else if (data) {
        setListings(data);
      }
      setLoading(false);
    }
    fetchListings();
  }, [answers]);

  // Analyze current listing when it changes
  useEffect(() => {
    if (listings.length > 0 && answers) {
      const currentListing = listings[currentIndex];
      if (currentListing) {
        setAnalysis(analyzeMatch(currentListing, answers));
        setShowWaitConfirm(false);
      }
    }
  }, [currentIndex, listings, answers]);

  const saveDecision = (listingId: string, decision: Decision) => {
    const updated = { ...decisions, [listingId]: decision };
    setDecisions(updated);
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(updated));
  };

  const handleTakeStep = () => {
    const item = listings[currentIndex];
    if (item?.url) {
      saveDecision(item.id, 'applied');
      window.open(item.url, '_blank');
    }
  };

  const handleWait = () => {
    const item = listings[currentIndex];
    if (item) {
      saveDecision(item.id, 'wait');
      setShowWaitConfirm(true);
    }
  };

  const handleNext = () => {
    setShowWaitConfirm(false);
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Finding your matches...</p>
        </div>
      </div>
    );
  }

  // No answers - redirect to flow
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

  // No listings
  if (listings.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold mb-2">No listings available</h1>
          <p className="text-gray-500 text-sm">Check back soon.</p>
        </div>
      </div>
    );
  }

  const item = listings[currentIndex];
  const currentDecision = decisions[item?.id];
  const hasImage = item?.images?.[0];

  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <Link href="/flow" className="text-sm text-gray-400 hover:text-gray-600">
          ← Edit criteria
        </Link>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} of {listings.length}
        </span>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 pb-56">

          {/* Listing Card */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">

            {/* Image */}
            <div className="relative aspect-[4/3] bg-gray-100">
              {hasImage ? (
                <img
                  src={item.images[0]}
                  alt={`${item.neighborhood} listing`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400">No photo available</p>
                </div>
              )}

              {/* Price Badge */}
              <div className="absolute bottom-3 left-3 bg-[#00A651] text-white font-semibold px-3 py-1.5 rounded-lg text-base">
                ${item?.price?.toLocaleString()}/mo
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
              {/* Location - Human format */}
              <h1 className="text-lg font-semibold text-gray-900">
                {item?.neighborhood}
                {item?.borough && item.borough !== item.neighborhood && (
                  <span className="text-gray-400 font-normal"> · {item.borough}</span>
                )}
              </h1>

              {/* Specs - Cleaner format */}
              <p className="text-sm text-gray-500 mt-1">
                {formatBedroomText(item?.bedrooms)} · {formatBathroomText(item?.bathrooms)}
                {item?.pets_allowed && ' · Pets OK'}
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
                    ? 'bg-red-50'
                    : analysis.pressureLevel === 'MEDIUM'
                    ? 'bg-amber-50'
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      analysis.pressureLevel === 'HIGH'
                        ? 'text-red-600'
                        : analysis.pressureLevel === 'MEDIUM'
                        ? 'text-amber-600'
                        : 'text-gray-500'
                    }`}>
                      {analysis.pressureLevel} pressure
                    </span>
                    <span className="text-sm font-medium text-gray-700">{analysis.score}% match</span>
                  </div>
                  <p className={`text-sm ${
                    analysis.pressureLevel === 'HIGH'
                      ? 'text-red-700'
                      : analysis.pressureLevel === 'MEDIUM'
                      ? 'text-amber-700'
                      : 'text-gray-600'
                  }`}>
                    {analysis.pressureText}
                  </p>
                </div>
              )}

              {/* Pepe's Take - Text only, no emoji */}
              {analysis && (
                <div className="mt-4 border-l-2 border-[#00A651] pl-3">
                  <p className="text-xs font-semibold text-[#00A651] uppercase tracking-wide mb-1">
                    Pepe's take
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {analysis.pepeTake}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Wait Confirmation */}
          {showWaitConfirm && analysis && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                Decision recorded: Waiting consciously
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                {analysis.waitTradeoff}
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
              disabled={!item?.url}
              className={`flex-1 py-3.5 rounded-xl font-semibold transition-all ${
                item?.url
                  ? 'bg-[#00A651] text-white active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentDecision === 'applied' ? 'Step taken' : 'Take the step'}
            </button>

            <button
              onClick={handleWait}
              disabled={showWaitConfirm || currentDecision === 'wait'}
              className={`flex-1 py-3.5 rounded-xl font-semibold transition-all ${
                showWaitConfirm || currentDecision === 'wait'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-amber-400 text-amber-900 active:scale-[0.98]'
              }`}
            >
              {showWaitConfirm || currentDecision === 'wait' ? 'Waiting' : 'Wait consciously'}
            </button>
          </div>

          {/* Microcopy */}
          <p className="text-xs text-gray-400 text-center">
            You're not committing yet. You're keeping this option alive.
          </p>

          {/* Navigation */}
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-medium text-gray-500 bg-gray-100 active:bg-gray-200 transition-all"
          >
            Next listing →
          </button>

        </div>
      </div>
    </main>
  );
}

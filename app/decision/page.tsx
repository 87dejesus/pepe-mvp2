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
  reasons: string[];
  concerns: string[];
  pepeTake: string;
  waitTradeoff: string;
};

function analyzeMatch(listing: Listing, answers: Answers): MatchAnalysis {
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 50;

  // Budget Analysis
  const budgetDiff = answers.budget - listing.price;
  const budgetPercent = (budgetDiff / answers.budget) * 100;

  if (listing.price <= answers.budget) {
    if (budgetPercent >= 20) {
      score += 20;
      reasons.push(`$${(answers.budget - listing.price).toLocaleString()} under budget`);
    } else if (budgetPercent >= 10) {
      score += 15;
      reasons.push('Comfortably within budget');
    } else {
      score += 10;
      reasons.push('Fits budget');
    }
  } else {
    const overPercent = ((listing.price - answers.budget) / answers.budget) * 100;
    if (overPercent <= 10) {
      score -= 10;
      concerns.push(`$${(listing.price - answers.budget).toLocaleString()} over budget`);
    } else {
      score -= 25;
      concerns.push('Significantly over budget');
    }
  }

  // Borough Match
  if (answers.boroughs.length > 0) {
    const boroughMatch = answers.boroughs.some(
      b => listing.borough?.toLowerCase().includes(b.toLowerCase()) ||
           listing.neighborhood?.toLowerCase().includes(b.toLowerCase())
    );
    if (boroughMatch) {
      score += 15;
      reasons.push('In your preferred area');
    } else {
      score -= 10;
      concerns.push('Outside preferred borough');
    }
  }

  // Bedrooms Match
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const neededBedrooms = bedroomMap[answers.bedrooms] ?? 1;

  if (listing.bedrooms >= neededBedrooms) {
    score += 10;
    if (listing.bedrooms > neededBedrooms) {
      reasons.push('Extra bedroom available');
    } else {
      reasons.push('Right bedroom count');
    }
  } else {
    score -= 15;
    concerns.push('Fewer bedrooms than needed');
  }

  // Bathrooms Match
  const bathroomMap: Record<string, number> = { '1': 1, '1.5': 1.5, '2+': 2 };
  const neededBathrooms = bathroomMap[answers.bathrooms] ?? 1;

  if (listing.bathrooms >= neededBathrooms) {
    score += 5;
    reasons.push('Bathroom count works');
  } else {
    score -= 5;
    concerns.push('Fewer bathrooms');
  }

  // Pets
  if (answers.pets !== 'none' && !listing.pets_allowed) {
    score -= 20;
    concerns.push('Pet policy unclear');
  } else if (answers.pets !== 'none' && listing.pets_allowed) {
    score += 10;
    reasons.push('Pet-friendly');
  }

  // Timing urgency bonus
  if (answers.timing === 'asap') {
    score += 5;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine pressure level
  let pressureLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  let pressureText: string;

  if (score >= 75) {
    pressureLevel = 'HIGH';
    pressureText = 'Strong match. In NYC, places like this move fast. Waiting means risking it.';
  } else if (score >= 55) {
    pressureLevel = 'MEDIUM';
    pressureText = 'Decent fit with tradeoffs. Worth considering, but not urgent.';
  } else {
    pressureLevel = 'LOW';
    pressureText = 'Weak match. No pressure here—keep looking.';
  }

  // Generate Pepe's Take
  const pepeTake = generatePepeTake(score, reasons, concerns);

  // Generate Wait Tradeoff text
  const waitTradeoff = generateWaitTradeoff(listing, score, concerns);

  return { score, pressureLevel, pressureText, reasons, concerns, pepeTake, waitTradeoff };
}

function generatePepeTake(
  score: number,
  reasons: string[],
  concerns: string[]
): string {
  if (score >= 80) {
    return `This checks your boxes. NYC apartments like this don't wait. Act now or risk losing it.`;
  } else if (score >= 65) {
    return `Good match. Not perfect, but solid. In this market, "good enough" is often the right call.`;
  } else if (score >= 50) {
    return `Mixed signals. ${concerns[0] || 'Some compromises here'}. Only you know if they're worth it.`;
  } else {
    return `This one doesn't fit what you told me. ${concerns[0] || 'Too many gaps'}. Keep exploring.`;
  }
}

function generateWaitTradeoff(listing: Listing, score: number, concerns: string[]): string {
  if (score >= 75) {
    return `By waiting, you accept that this ${listing.neighborhood} listing may be gone tomorrow. If another renter acts first, you'll need to find something else that matches ${listing.bedrooms}BR under $${listing.price?.toLocaleString()}.`;
  } else if (score >= 55) {
    return `Waiting is reasonable here. The concerns (${concerns.slice(0, 2).join(', ') || 'tradeoffs'}) are real. But remember: in NYC, "perfect" rarely exists. You're trading certainty for optionality.`;
  } else {
    return `Good call to wait. This listing has gaps that would frustrate you daily. Your criteria exist for a reason—trust them.`;
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
        // Sort by match score (best first)
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

  const handleApply = () => {
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
          <div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base font-medium text-gray-600">Finding your matches...</p>
        </div>
      </div>
    );
  }

  // No answers - redirect to flow
  if (!answers) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🐸</span>
          </div>
          <h1 className="text-xl font-bold mb-2">First, tell me what you need</h1>
          <p className="text-gray-500 text-sm mb-6">
            I need your criteria to find the right matches.
          </p>
          <Link
            href="/flow"
            className="inline-block bg-[#00A651] text-white font-semibold py-3 px-6 rounded-lg"
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
          <h1 className="text-xl font-bold mb-2">No listings yet</h1>
          <p className="text-gray-500 text-sm">Check back soon.</p>
        </div>
      </div>
    );
  }

  const item = listings[currentIndex];
  const currentDecision = decisions[item?.id];

  return (
    <main className="min-h-screen bg-[#f8f8f8] flex flex-col">
      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <Link href="/flow" className="text-sm text-gray-500 hover:text-black">
          ← Criteria
        </Link>
        <span className="text-sm font-medium text-gray-700">
          {currentIndex + 1} of {listings.length}
        </span>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 pb-48">

          {/* Listing Card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">

            {/* Image */}
            <div className="relative aspect-[4/3]">
              {item?.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt={item.neighborhood}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}

              {/* Price Badge */}
              <div className="absolute bottom-3 left-3 bg-[#00A651] text-white font-bold text-lg px-3 py-1 rounded-lg">
                ${item?.price?.toLocaleString()}/mo
              </div>

              {/* Decision Badge (if already decided) */}
              {currentDecision && (
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-lg font-semibold text-sm ${
                  currentDecision === 'applied'
                    ? 'bg-[#00A651] text-white'
                    : 'bg-yellow-400 text-black'
                }`}>
                  {currentDecision === 'applied' ? '✓ Applied' : '⏸ Waiting'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              {/* Location */}
              <h1 className="text-xl font-bold">
                {item?.neighborhood}
              </h1>
              <p className="text-sm text-gray-500 mb-3">{item?.borough}</p>

              {/* Specs */}
              <div className="flex gap-2 text-sm mb-4">
                <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                  {item?.bedrooms} bed
                </span>
                <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                  {item?.bathrooms} bath
                </span>
                {item?.pets_allowed && (
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                    Pets OK
                  </span>
                )}
              </div>

              {/* Pressure Level */}
              {analysis && (
                <div className={`rounded-lg p-3 mb-4 ${
                  analysis.pressureLevel === 'HIGH'
                    ? 'bg-red-50 border border-red-200'
                    : analysis.pressureLevel === 'MEDIUM'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase ${
                      analysis.pressureLevel === 'HIGH'
                        ? 'text-red-600'
                        : analysis.pressureLevel === 'MEDIUM'
                        ? 'text-yellow-700'
                        : 'text-gray-600'
                    }`}>
                      {analysis.pressureLevel} PRESSURE
                    </span>
                    <span className="text-sm font-bold">{analysis.score}% match</span>
                  </div>
                  <p className={`text-sm ${
                    analysis.pressureLevel === 'HIGH'
                      ? 'text-red-700'
                      : analysis.pressureLevel === 'MEDIUM'
                      ? 'text-yellow-800'
                      : 'text-gray-600'
                  }`}>
                    {analysis.pressureText}
                  </p>
                </div>
              )}

              {/* Pepe's Take */}
              {analysis && (
                <div className="bg-[#f0fdf4] rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🐸</span>
                    <div>
                      <p className="text-xs font-bold text-[#00A651] uppercase mb-1">Pepe's Take</p>
                      <p className="text-sm text-gray-700">{analysis.pepeTake}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Facts */}
              {analysis && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analysis.reasons.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-center gap-1 text-green-700">
                      <span>✓</span> {r}
                    </div>
                  ))}
                  {analysis.concerns.slice(0, 2).map((c, i) => (
                    <div key={i} className="flex items-center gap-1 text-yellow-700">
                      <span>!</span> {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wait Confirmation (shows after clicking WAIT) */}
          {showWaitConfirm && analysis && (
            <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-xl p-4">
              <p className="text-sm font-bold text-yellow-800 mb-2">Decision recorded: Wait consciously</p>
              <p className="text-sm text-yellow-700">{analysis.waitTradeoff}</p>
            </div>
          )}

        </div>
      </div>

      {/* Fixed Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6">
        <div className="max-w-md mx-auto space-y-2">

          {/* Primary Actions Row */}
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={!item?.url}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                item?.url
                  ? 'bg-[#00A651] active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {currentDecision === 'applied' ? '✓ Applied' : 'Apply Now'}
            </button>

            <button
              onClick={handleWait}
              disabled={showWaitConfirm}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                showWaitConfirm || currentDecision === 'wait'
                  ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                  : 'bg-yellow-400 text-black active:scale-[0.98]'
              }`}
            >
              {showWaitConfirm || currentDecision === 'wait' ? '⏸ Waiting' : 'Wait Consciously'}
            </button>
          </div>

          {/* Navigation Row */}
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-medium text-gray-600 bg-gray-100 active:bg-gray-200 transition-all"
          >
            Next listing →
          </button>

        </div>
      </div>
    </main>
  );
}

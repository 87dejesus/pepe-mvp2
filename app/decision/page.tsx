'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LS_KEY = 'pepe_answers_v2';

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

type MatchAnalysis = {
  score: number;
  verdict: 'ACT' | 'WAIT';
  reasons: string[];
  concerns: string[];
  pepeTake: string;
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
      reasons.push(`$${(answers.budget - listing.price).toLocaleString()} under your budget - breathing room for NYC surprises`);
    } else if (budgetPercent >= 10) {
      score += 15;
      reasons.push('Comfortably within your budget');
    } else {
      score += 10;
      reasons.push('Fits your budget');
    }
  } else {
    const overPercent = ((listing.price - answers.budget) / answers.budget) * 100;
    if (overPercent <= 10) {
      score -= 10;
      concerns.push(`$${(listing.price - answers.budget).toLocaleString()} over budget - manageable but tight`);
    } else {
      score -= 25;
      concerns.push(`Significantly over budget - could strain your NYC lifestyle`);
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
      reasons.push(`Located in your preferred area`);
    } else {
      score -= 10;
      concerns.push(`Not in your preferred borough - consider commute impact`);
    }
  }

  // Bedrooms Match
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const neededBedrooms = bedroomMap[answers.bedrooms] ?? 1;

  if (listing.bedrooms >= neededBedrooms) {
    score += 10;
    if (listing.bedrooms > neededBedrooms) {
      reasons.push(`Extra bedroom - flexibility for office/guests`);
    } else {
      reasons.push('Perfect bedroom count for your needs');
    }
  } else {
    score -= 15;
    concerns.push(`Fewer bedrooms than you wanted - space will feel tight`);
  }

  // Bathrooms Match
  const bathroomMap: Record<string, number> = { '1': 1, '1.5': 1.5, '2+': 2 };
  const neededBathrooms = bathroomMap[answers.bathrooms] ?? 1;

  if (listing.bathrooms >= neededBathrooms) {
    score += 5;
    reasons.push('Bathroom count works for smooth mornings');
  } else {
    score -= 5;
    concerns.push('Fewer bathrooms - morning routines may overlap');
  }

  // Pets
  if (answers.pets !== 'none' && !listing.pets_allowed) {
    score -= 20;
    concerns.push('Pet policy unclear - verify before applying');
  } else if (answers.pets !== 'none' && listing.pets_allowed) {
    score += 10;
    reasons.push('Pet-friendly - your furry friend is welcome');
  }

  // Timing urgency
  if (answers.timing === 'asap') {
    score += 5;
    reasons.push('Available now matches your urgent timeline');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine verdict
  const verdict: 'ACT' | 'WAIT' = score >= 65 ? 'ACT' : 'WAIT';

  // Generate Pepe's Take
  const pepeTake = generatePepeTake(listing, answers, score, verdict, reasons, concerns);

  return { score, verdict, reasons, concerns, pepeTake };
}

function generatePepeTake(
  listing: Listing,
  answers: Answers,
  score: number,
  verdict: 'ACT' | 'WAIT',
  reasons: string[],
  concerns: string[]
): string {
  if (verdict === 'ACT') {
    if (score >= 85) {
      return `This one checks almost all your boxes. In NYC, apartments like this don't sit around. If you've been burned by slow decisions before, this is your moment to act with confidence. The fundamentals align with what you told me matters.`;
    } else if (score >= 75) {
      return `Strong match for your criteria. Yes, there might be a "perfect" place out there, but in this market, chasing perfect often means losing good. This place solves your core needs - ${reasons[0]?.toLowerCase() || 'solid fit'}. Trust your gut here.`;
    } else {
      return `It's not perfect, but it hits the essentials. NYC apartment hunting is exhausting, and this one doesn't have any deal-breakers. Sometimes "good enough" in NYC is actually great. Don't let analysis paralysis cost you a solid option.`;
    }
  } else {
    if (concerns.length > 2) {
      return `I see too many friction points here for your situation. ${concerns[0]}. In a city with endless options, settling for something with this many compromises will wear on you. Your future self will thank you for waiting.`;
    } else {
      return `This one doesn't quite fit the picture you painted for me. ${concerns[0] || 'The match isn\'t strong enough'}. NYC is relentless - you need a home that works FOR you, not one you have to work around. Keep looking, the right one exists.`;
    }
  }
}

export default function DecisionPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
  }, []);

  // Fetch listings
  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'Active');
      if (data) setListings(data);
      setLoading(false);
    }
    fetchListings();
  }, []);

  // Analyze current listing when it changes
  useEffect(() => {
    if (listings.length > 0 && answers) {
      const currentListing = listings[currentIndex];
      if (currentListing) {
        setAnalysis(analyzeMatch(currentListing, answers));
      }
    }
  }, [currentIndex, listings, answers]);

  const handleNext = () => {
    setShowDetails(false);
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    setShowDetails(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(listings.length - 1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Pepe is analyzing deals...</p>
        </div>
      </div>
    );
  }

  // No answers - redirect to flow
  if (!answers) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="bg-white border-4 border-black p-8 max-w-md text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-black mb-4">Hold up!</h1>
          <p className="text-gray-600 mb-6">
            Pepe needs to know what you're looking for before showing recommendations.
          </p>
          <Link
            href="/flow"
            className="inline-block bg-[#00A651] text-white font-bold py-3 px-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="bg-white border-4 border-black p-8 max-w-md text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-black mb-4">No listings yet</h1>
          <p className="text-gray-600">Check back soon - Pepe is hunting for deals.</p>
        </div>
      </div>
    );
  }

  const item = listings[currentIndex];

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b-4 border-black px-4 py-3 flex items-center justify-between">
        <Link href="/flow" className="text-sm font-bold text-gray-500 hover:text-black">
          ← Edit Criteria
        </Link>
        <span className="text-sm font-bold">
          {currentIndex + 1} / {listings.length}
        </span>
      </div>

      {/* Main Card */}
      <div className="max-w-lg mx-auto p-4 pb-32">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Image with Price Badge */}
          <div className="relative">
            {item?.images?.[0] ? (
              <img
                src={item.images[0]}
                alt={item.neighborhood}
                className="w-full h-64 object-cover border-b-4 border-black"
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 flex items-center justify-center border-b-4 border-black">
                <span className="text-gray-500 font-bold">No Image</span>
              </div>
            )}
            {/* Price Badge */}
            <div className="absolute top-3 right-3 bg-[#00A651] border-4 border-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-white font-black text-xl">
                ${item?.price?.toLocaleString()}
              </span>
            </div>
            {/* Verdict Badge */}
            {analysis && (
              <div className={`absolute top-3 left-3 border-4 border-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                analysis.verdict === 'ACT' ? 'bg-[#00A651]' : 'bg-yellow-400'
              }`}>
                <span className={`font-black text-sm ${analysis.verdict === 'ACT' ? 'text-white' : 'text-black'}`}>
                  {analysis.verdict === 'ACT' ? '✓ ACT NOW' : '⏸ WAIT'}
                </span>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="p-5">
            {/* Location */}
            <h2 className="text-2xl font-black italic uppercase tracking-tight">
              {item?.neighborhood || 'NYC'}
            </h2>
            {item?.borough && (
              <p className="text-sm text-gray-500 font-semibold uppercase">{item.borough}</p>
            )}

            {/* Specs */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="bg-gray-100 border-2 border-black px-3 py-1 text-sm font-bold">
                {item?.bedrooms} Bed
              </span>
              <span className="bg-gray-100 border-2 border-black px-3 py-1 text-sm font-bold">
                {item?.bathrooms} Bath
              </span>
              {item?.pets_allowed && (
                <span className="bg-green-100 border-2 border-black px-3 py-1 text-sm font-bold">
                  Pets OK
                </span>
              )}
            </div>

            {/* Match Score */}
            {analysis && (
              <div className="mt-5 pt-5 border-t-4 border-black">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm uppercase text-gray-600">Match Score</span>
                  <span className={`font-black text-2xl ${
                    analysis.score >= 75 ? 'text-[#00A651]' :
                    analysis.score >= 50 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {analysis.score}%
                  </span>
                </div>
                {/* Score Bar */}
                <div className="h-3 bg-gray-200 border-2 border-black">
                  <div
                    className={`h-full transition-all duration-500 ${
                      analysis.score >= 75 ? 'bg-[#00A651]' :
                      analysis.score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Pepe's Take */}
            {analysis && (
              <div className="mt-5 bg-gray-50 border-4 border-black p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0">
                    <img src="/pepe-ny.jpeg.jpeg" alt="Pepe" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase text-[#00A651] mb-1">Pepe's Take</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{analysis.pepeTake}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full mt-4 py-2 text-sm font-bold text-gray-500 hover:text-black transition-colors"
            >
              {showDetails ? '− Hide Details' : '+ Show Details'}
            </button>

            {/* Detailed Analysis */}
            {showDetails && analysis && (
              <div className="mt-4 space-y-4">
                {/* Reasons */}
                {analysis.reasons.length > 0 && (
                  <div>
                    <p className="font-bold text-sm text-[#00A651] mb-2">✓ What works:</p>
                    <ul className="space-y-1">
                      {analysis.reasons.map((r, i) => (
                        <li key={i} className="text-sm text-gray-600 pl-4 border-l-4 border-[#00A651]">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Concerns */}
                {analysis.concerns.length > 0 && (
                  <div>
                    <p className="font-bold text-sm text-yellow-600 mb-2">⚠ Watch out:</p>
                    <ul className="space-y-1">
                      {analysis.concerns.map((c, i) => (
                        <li key={i} className="text-sm text-gray-600 pl-4 border-l-4 border-yellow-400">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Description */}
                {item?.description && (
                  <div>
                    <p className="font-bold text-sm text-gray-500 mb-2">Description:</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                )}
                {/* View Listing Link */}
                {item?.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm font-bold text-[#00A651] underline"
                  >
                    View Original Listing →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={handlePrevious}
            className="px-6 py-4 bg-gray-100 border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-4 bg-[#00A651] text-white border-4 border-black font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            NEXT LISTING →
          </button>
        </div>
      </div>
    </main>
  );
}

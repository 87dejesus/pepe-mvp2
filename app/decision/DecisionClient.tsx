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

// Calculate match score (0-100)
function calculateMatchScore(listing: Listing, answers: Answers): number {
  let score = 0;
  let maxPoints = 0;

  // Budget (40 points max)
  maxPoints += 40;
  if (listing.price <= answers.budget) {
    const pctUnder = (answers.budget - listing.price) / answers.budget;
    score += 40; // Full points if under budget
    if (pctUnder > 0.1) score += 5; // Bonus for being >10% under
  } else {
    const pctOver = (listing.price - answers.budget) / answers.budget;
    score += Math.max(0, 30 - pctOver * 100); // Deduct based on how much over
  }

  // Bedrooms (25 points)
  maxPoints += 25;
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (answers.bedrooms === '3+') {
    if (listing.bedrooms >= 3) score += 25;
  } else {
    if (listing.bedrooms === needed) score += 25;
  }

  // Borough/Location (25 points)
  maxPoints += 25;
  if (answers.boroughs.length > 0) {
    const inPreferred = answers.boroughs.some(
      b => (listing.borough || '').toLowerCase().includes(b.toLowerCase()) ||
           (listing.neighborhood || '').toLowerCase().includes(b.toLowerCase())
    );
    if (inPreferred) score += 25;
  } else {
    score += 25; // No preference = match
  }

  // Pets (10 points)
  maxPoints += 10;
  if (answers.pets === 'none') {
    score += 10;
  } else {
    if (listing.pets?.toLowerCase() === 'yes') score += 10;
  }

  return Math.min(100, Math.round((score / maxPoints) * 100));
}

// Determine recommendation
function getRecommendation(score: number): 'ACT_NOW' | 'WAIT' {
  return score >= 75 ? 'ACT_NOW' : 'WAIT';
}

export default function DecisionClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [initError, setInitError] = useState<string | null>(null);


  // Initialize Supabase client safely
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const client = createClient(url, key);
        setSupabaseClient(client);
      } catch (err) {
        console.error('Failed to initialize Supabase:', err);
        setInitError('Failed to connect to database');
        setLoading(false);
      }
    } else {
      console.error('Supabase env vars missing');
      setInitError('Database configuration missing');
      setLoading(false);
    }
  }, []);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        setAnswers(JSON.parse(stored));
      } catch {
        // ignore
      }
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
      const { data, error } = await supabaseClient!
        .from('listings')
        .select('*')
        .eq('status', 'Active');

      if (error) {
        console.error('Failed to fetch listings:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
        const needed = bedroomMap[answers!.bedrooms] ?? 1;

        const filtered = data.filter((l: Listing) => {
          if (!l.original_url) return false;

          // Budget: strict cap
          if (l.price > answers!.budget) return false;

          // Bedrooms
          if (answers!.bedrooms === '3+') {
            if (l.bedrooms < 3) return false;
          } else {
            if (l.bedrooms !== needed) return false;
          }

          // Borough/location: must match at least one preferred borough
          if (answers!.boroughs.length > 0) {
            const boroughMatch = answers!.boroughs.some(
              b => (l.borough || '').toLowerCase().includes(b.toLowerCase()) ||
                   (l.neighborhood || '').toLowerCase().includes(b.toLowerCase())
            );
            if (!boroughMatch) return false;
          }

          // Placeholder image filter (scraper artifact)
          const img = l.image_url || l.images?.[0] || '';
          if (img.includes('add7ffb')) return false;

          return true;
        });

        // Sort by simple score
        filtered.sort((a, b) => {
          const scoreA = a.price <= answers!.budget ? 100 - a.price / 100 : 50 - a.price / 100;
          const scoreB = b.price <= answers!.budget ? 100 - b.price / 100 : 50 - b.price / 100;
          return scoreB - scoreA;
        });

        // Ensure unique IDs + deduplicate images
        const seenIds = new Set<string>();
        const seenImageUrls = new Set<string>();
        const sanitized = filtered
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
            if (!imageUrl) return false;
            if (seenImageUrls.has(imageUrl)) return false;
            seenImageUrls.add(imageUrl);
            return true;
          });

        setListings(sanitized);
      }
      setLoading(false);
    }
    fetchData();
  }, [answers, supabaseClient]);

  // Calculate current listing and score (moved up for use in handlers)
  const currentListing = listings[currentIndex] || null;
  const matchScore = currentListing && answers ? calculateMatchScore(currentListing, answers) : 0;
  const recommendation = getRecommendation(matchScore);

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
      <div className="h-[100dvh] flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm border-2 border-black p-6">
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
      <div className="h-[100dvh] flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm border-2 border-black p-6">
          <h1 className="text-xl font-bold mb-2">First, tell me what you need</h1>
          <p className="text-gray-500 text-sm mb-6">Answer a few questions so I can find the right matches.</p>
          <Link href="/flow" className="inline-block bg-[#00A651] text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1">
            Start
          </Link>
        </div>
      </div>
    );
  }

  // No listings
  if (listings.length === 0) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm border-2 border-black p-6">
          <h1 className="text-xl font-bold mb-2">No matches right now</h1>
          <p className="text-gray-500 text-sm mb-6">Try adjusting your criteria.</p>
          <Link href="/flow" className="inline-block bg-[#00A651] text-white font-bold py-3 px-6 border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1">
            Adjust criteria
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f5f5f5]">
      {/* Header - Neobrutalista */}
      <header className="shrink-0 bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between">
        <Link href="/flow" className="text-sm font-bold text-black hover:underline">
          ← EDIT CRITERIA
        </Link>
        <span className="text-sm font-bold text-black">
          {currentIndex + 1} / {listings.length}
        </span>
      </header>

      {/* Main - Fill space, no justify-center */}
      <main className="flex-1 overflow-auto p-3 pb-32 min-h-0">
        {currentListing && (
          <div key={currentListing.id} className="max-w-lg mx-auto w-full h-full flex flex-col">
            <DecisionListingCard
              listing={currentListing}
              answers={answers}
              matchScore={matchScore}
              recommendation={recommendation}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black px-4 py-4 pb-6">
        <div className="max-w-lg mx-auto">
          {/* CTA Buttons */}
          <div className="flex gap-3 mb-3">
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

          {/* Navigation */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handlePrev}
              className="py-2 px-4 text-sm font-bold border-2 border-black bg-white hover:bg-gray-100"
            >
              ← PREV
            </button>
            <button
              onClick={handleNext}
              className="py-2 px-6 text-sm font-bold border-2 border-black bg-[#00A651] text-white shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              NEXT →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

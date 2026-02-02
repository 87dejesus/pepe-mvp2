'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import DecisionListingCard from '@/components/DecisionListingCard';

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
  image_url: string;
  images: string[];
  pets: string;
  amenities: string[];
  original_url: string | null;
  status: string;
};

type Decision = 'applied' | 'wait' | null;

export default function DecisionClient() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

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
    if (!answers) return;

    async function fetch() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'Active');

      if (data) {
        const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
        const needed = bedroomMap[answers!.bedrooms] ?? 1;

        const filtered = data.filter((l: Listing) => {
          if (!l.original_url) return false;
          if (answers!.bedrooms === '3+') {
            if (l.bedrooms < 3) return false;
          } else {
            if (l.bedrooms !== needed) return false;
          }
          if (l.price > answers!.budget * 1.1) return false;
          return true;
        });

        // Sort by simple score
        filtered.sort((a, b) => {
          const scoreA = a.price <= answers!.budget ? 100 - a.price / 100 : 50 - a.price / 100;
          const scoreB = b.price <= answers!.budget ? 100 - b.price / 100 : 50 - b.price / 100;
          return scoreB - scoreA;
        });

        setListings(filtered);
      }
      setLoading(false);
    }
    fetch();
  }, [answers]);

  const currentListing = listings[currentIndex] || null;

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
    router.push('/exit?choice=wait');
  };

  const handleNext = () => {
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(currentIndex + 1);
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

  // No answers
  if (!answers) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">First, tell me what you need</h1>
          <p className="text-gray-500 text-sm mb-6">Answer a few questions so I can find the right matches.</p>
          <Link href="/flow" className="inline-block bg-[#00A651] text-white font-medium py-3 px-6 rounded-lg">
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
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">No matches right now</h1>
          <p className="text-gray-500 text-sm mb-6">Try adjusting your criteria.</p>
          <Link href="/flow" className="inline-block bg-[#00A651] text-white font-medium py-3 px-6 rounded-lg">
            Adjust criteria
          </Link>
        </div>
      </div>
    );
  }

  // End of listings
  if (!currentListing) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">You've seen all matches</h1>
          <p className="text-gray-500 text-sm mb-6">{listings.length} listings reviewed.</p>
          <div className="space-y-3">
            <Link href="/flow" className="block bg-[#00A651] text-white font-medium py-3 px-6 rounded-lg">
              Adjust criteria
            </Link>
            <button onClick={() => setCurrentIndex(0)} className="block w-full text-gray-500 text-sm py-2">
              Review again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentDecision = decisions[currentListing.id];
  const isLast = currentIndex >= listings.length - 1;

  return (
    <div className="h-[100dvh] flex flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/flow" className="text-sm text-gray-400 hover:text-gray-600">
          ← Edit criteria
        </Link>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} of {listings.length}
        </span>
      </header>

      {/* Main - scrollable */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto">
          <DecisionListingCard
            key={currentListing.id}
            listing={currentListing}
            answers={answers}
          />
        </div>
      </main>

      {/* Footer - NOT fixed */}
      <footer className="shrink-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleApply}
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
              className={`flex-1 py-3.5 rounded-xl font-semibold transition-all ${
                currentDecision === 'wait'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-amber-400 text-amber-900 active:scale-[0.98]'
              }`}
            >
              {currentDecision === 'wait' ? 'Waiting' : 'Wait consciously'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            You're not committing yet. You're keeping this option alive.
          </p>
          {isLast ? (
            <Link href="/flow" className="block text-center text-xs text-[#00A651] py-1">
              End of matches · Adjust criteria
            </Link>
          ) : (
            <button onClick={handleNext} className="w-full text-xs text-gray-400 py-1">
              Skip to next →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

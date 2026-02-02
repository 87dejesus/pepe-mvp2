'use client';

import { useState, useEffect } from 'react';

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
};

type Answers = {
  boroughs: string[];
  budget: number;
  bedrooms: string;
  bathrooms: string;
  pets: string;
  amenities: string[];
  timing: string;
};

type Props = {
  listing: Listing;
  answers: Answers;
};

function formatBedrooms(n: number): string {
  if (n === 0) return 'Studio';
  if (n === 1) return '1 bed';
  return `${n} beds`;
}

function formatBathrooms(n: number): string {
  if (n === 1) return '1 bath';
  return `${n} baths`;
}

function computeMatch(listing: Listing, answers: Answers) {
  let score = 50;

  // Budget
  if (listing.price <= answers.budget) {
    const pct = ((answers.budget - listing.price) / answers.budget) * 100;
    if (pct >= 20) score += 20;
    else if (pct >= 10) score += 15;
    else score += 10;
  } else {
    const over = ((listing.price - answers.budget) / answers.budget) * 100;
    if (over <= 10) score -= 10;
    else score -= 25;
  }

  // Borough
  if (answers.boroughs.length > 0) {
    const match = answers.boroughs.some(
      b => listing.borough?.toLowerCase().includes(b.toLowerCase()) ||
           listing.neighborhood?.toLowerCase().includes(b.toLowerCase())
    );
    score += match ? 15 : -10;
  }

  // Bedrooms
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  score += listing.bedrooms >= needed ? 10 : -15;

  // Bathrooms
  const bathMap: Record<string, number> = { '1': 1, '1.5': 1.5, '2+': 2 };
  const neededBath = bathMap[answers.bathrooms] ?? 1;
  score += listing.bathrooms >= neededBath ? 5 : -5;

  // Pets
  const petsAllowed = listing.pets?.toLowerCase() === 'yes';
  const petsNo = listing.pets?.toLowerCase() === 'no';
  if (answers.pets !== 'none' && petsNo) score -= 20;
  else if (answers.pets !== 'none' && petsAllowed) score += 10;

  // Timing
  if (answers.timing === 'asap') score += 5;

  score = Math.max(0, Math.min(100, score));

  let level: 'HIGH' | 'MEDIUM' | 'LOW';
  let text: string;

  if (score >= 75) {
    level = 'HIGH';
    text = 'Strong match. Listings like this move fast in NYC.';
  } else if (score >= 55) {
    level = 'MEDIUM';
    text = 'Reasonable fit with some tradeoffs.';
  } else {
    level = 'LOW';
    text = 'Has gaps compared to your criteria.';
  }

  return { score, level, text };
}

function getPepeTake(listing: Listing, answers: Answers, score: number, hasImage: boolean): string {
  if (!hasImage) {
    return "No photos yet. The numbers look reasonable—consider requesting images before deciding.";
  }
  if (score >= 80) {
    return "This checks your boxes: budget, location, size. Worth serious consideration.";
  }
  if (score >= 65) {
    const note = listing.price <= answers.budget ? 'Budget is comfortable.' : 'Stretches your budget a bit.';
    return `Solid match. ${note} In NYC, good enough often beats waiting for perfect.`;
  }
  if (score >= 50) {
    return "Mixed signals. Works on some levels, not others.";
  }
  return "Doesn't line up well with what you told me matters.";
}

export default function DecisionListingCard({ listing, answers }: Props) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Visual feedback: brief flash on listing change
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [listing.id]);

  const hasImage = !!(listing.image_url || (listing.images?.length > 0 && listing.images[0]));
  const imageUrl = listing.image_url || listing.images?.[0] || '';
  const match = computeMatch(listing, answers);
  const pepeTake = getPepeTake(listing, answers, match.score, hasImage);

  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-200">
        {imageUrl ? (
          <img
            key={`img-${listing.id}`}
            src={imageUrl}
            alt={listing.neighborhood}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Image not available</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-[#00A651] text-white font-semibold px-3 py-1.5 rounded-lg">
          ${listing.price?.toLocaleString()}/mo
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Location */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {listing.neighborhood}
            {listing.borough && listing.borough !== listing.neighborhood && (
              <span className="text-gray-400 font-normal"> · {listing.borough}</span>
            )}
          </h2>
          <p className="text-sm text-gray-500">
            {formatBedrooms(listing.bedrooms)} · {formatBathrooms(listing.bathrooms)}
            {listing.pets?.toLowerCase() === 'yes' && ' · Pets OK'}
          </p>
        </div>

        {/* Pressure Level - ALWAYS VISIBLE, fixed min height */}
        <div className={`rounded-lg p-3 min-h-[72px] ${
          match.level === 'HIGH' ? 'bg-emerald-50' :
          match.level === 'MEDIUM' ? 'bg-amber-50' : 'bg-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wide ${
              match.level === 'HIGH' ? 'text-emerald-600' :
              match.level === 'MEDIUM' ? 'text-amber-600' : 'text-gray-500'
            }`}>
              {match.level === 'HIGH' ? 'Strong match' :
               match.level === 'MEDIUM' ? 'Worth considering' : 'Keep looking'}
            </span>
            <span className="text-sm font-medium text-gray-700">{match.score}%</span>
          </div>
          <p className={`text-sm ${
            match.level === 'HIGH' ? 'text-emerald-700' :
            match.level === 'MEDIUM' ? 'text-amber-700' : 'text-gray-600'
          }`}>
            {match.text}
          </p>
        </div>

        {/* Pepe's Take - fixed min height */}
        <div className="bg-gray-50 rounded-lg p-3 min-h-[88px]">
          <div className="flex items-start gap-3">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Pepe"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#00A651] shrink-0"
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#00A651] uppercase tracking-wide mb-1">
                Pepe's take
              </p>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                {pepeTake}
              </p>
            </div>
          </div>
        </div>

        {/* Description snippet - fixed height slot */}
        <div className="min-h-[40px]">
          {listing.description ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {listing.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description available</p>
          )}
        </div>
      </div>
    </div>
  );
}

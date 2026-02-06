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
  matchScore: number;
  recommendation: 'ACT_NOW' | 'WAIT';
};

function formatBedrooms(n: number): string {
  if (n === 0) return 'STUDIO';
  if (n === 1) return '1 BED';
  return `${n} BEDS`;
}

function formatBathrooms(n: number): string {
  if (n === 1) return '1 BATH';
  return `${n} BATHS`;
}

// Generate empathetic Pepe commentary
function buildPepeTake(listing: Listing, answers: Answers, score: number): string {
  const parts: string[] = [];
  const neighborhood = listing.neighborhood || listing.borough || 'this area';

  // Budget analysis
  if (listing.price <= answers.budget) {
    const savings = answers.budget - listing.price;
    if (savings > 200) {
      parts.push(`This ${neighborhood} spot saves you $${savings.toLocaleString()}/mo from your budget`);
    } else {
      parts.push(`Right at your $${answers.budget.toLocaleString()} budget`);
    }
  } else {
    const over = listing.price - answers.budget;
    parts.push(`$${over.toLocaleString()}/mo over budget, but might be worth stretching for`);
  }

  // Bedroom match
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (listing.bedrooms === needed || (answers.bedrooms === '3+' && listing.bedrooms >= 3)) {
    parts.push(`exactly the ${formatBedrooms(listing.bedrooms).toLowerCase()} you wanted`);
  }

  // Location match
  if (answers.boroughs.length > 0) {
    const inPreferred = answers.boroughs.some(
      b => (listing.borough || '').toLowerCase().includes(b.toLowerCase()) ||
           (listing.neighborhood || '').toLowerCase().includes(b.toLowerCase())
    );
    if (inPreferred) {
      parts.push(`in your preferred ${listing.borough} area`);
    }
  }

  // Pet situation
  if (answers.pets !== 'none' && listing.pets?.toLowerCase() === 'yes') {
    parts.push('pets welcome here');
  }

  // Build the final message
  if (parts.length === 0) {
    return score >= 75
      ? `This ${neighborhood} listing hits most of your criteria. Worth a serious look!`
      : `This one doesn't match everything, but ${neighborhood} has its perks. Keep exploring!`;
  }

  const intro = score >= 75 ? 'Great match!' : 'Interesting option.';
  return `${intro} ${parts.join(', ')}.`;
}

export default function DecisionListingCard({ listing, answers, matchScore, recommendation }: Props) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [listing.id]);

  const rawImageUrl = listing.image_url || listing.images?.[0] || '';
  const hasValidImage = rawImageUrl && !rawImageUrl.includes('add7ffb');
  const pepeTake = buildPepeTake(listing, answers, matchScore);

  return (
    <div
      className={`bg-white border-2 border-black flex-1 flex flex-col transition-opacity duration-150 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] bg-gray-200 border-b-2 border-black shrink-0">
        {hasValidImage ? (
          <img
            key={`img-${listing.id}`}
            src={rawImageUrl}
            alt={listing.neighborhood}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
            NO PHOTO
          </div>
        )}

        {/* Price Tag - Top Right */}
        <div className="absolute top-2 right-2 bg-[#00A651] text-white font-bold text-lg px-3 py-1 border-2 border-black">
          ${listing.price?.toLocaleString()}/MO
        </div>

        {/* Recommendation Badge - Top Left */}
        <div className={`absolute top-2 left-2 font-bold text-sm px-3 py-1 border-2 border-black ${
          recommendation === 'ACT_NOW'
            ? 'bg-[#00A651] text-white'
            : 'bg-amber-400 text-black'
        }`}>
          {recommendation === 'ACT_NOW' ? '⚡ ACT NOW' : '⏳ WAIT'}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Neighborhood - Bold Italic Uppercase */}
        <h2 className="text-2xl font-bold italic uppercase tracking-tight text-black">
          {listing.neighborhood || 'UNKNOWN'}
        </h2>

        {/* Borough + Specs Row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {listing.borough && listing.borough !== listing.neighborhood && (
            <span className="text-sm font-bold uppercase text-gray-600">
              {listing.borough}
            </span>
          )}
          <span className="border-2 border-black px-2 py-0.5 text-xs font-bold">
            {formatBedrooms(listing.bedrooms)}
          </span>
          <span className="border-2 border-black px-2 py-0.5 text-xs font-bold">
            {formatBathrooms(listing.bathrooms)}
          </span>
          {listing.pets?.toLowerCase() === 'yes' && (
            <span className="border-2 border-black px-2 py-0.5 text-xs font-bold bg-green-100">
              🐾 PETS OK
            </span>
          )}
        </div>

        {/* Match Score Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold uppercase">Match Score</span>
            <span className="text-sm font-bold">{matchScore}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 border-2 border-black">
            <div
              className={`h-full transition-all duration-500 ${
                matchScore >= 75 ? 'bg-[#00A651]' : matchScore >= 50 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>

        {/* Pepe's Take */}
        <div className="mt-4 p-3 border-2 border-black bg-gray-50 flex-1">
          <div className="flex items-start gap-3">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Pepe"
              className="w-10 h-10 border-2 border-black object-cover shrink-0"
            />
            <div>
              <p className="text-xs font-bold uppercase mb-1">PEPE'S TAKE</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {pepeTake}
              </p>
            </div>
          </div>
        </div>

        {/* Description - One line */}
        {listing.description && (
          <p className="text-xs text-gray-500 mt-3 line-clamp-2 border-t-2 border-dashed border-gray-300 pt-3">
            {listing.description}
          </p>
        )}
      </div>
    </div>
  );
}

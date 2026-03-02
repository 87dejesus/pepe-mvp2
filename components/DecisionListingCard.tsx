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
  warnings?: string[];
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

// Detect incentives in description
const INCENTIVE_PATTERNS: { regex: RegExp; message: string }[] = [
  { regex: /(\d+)\s*months?\s*free/i, message: 'offers free month(s)!' },
  { regex: /free\s*months?/i, message: 'offers a free month!' },
  { regex: /no\s*(broker\s*)?fee/i, message: 'no broker fee!' },
  { regex: /move[- ]?in\s*special/i, message: 'has a move-in special!' },
  { regex: /concession/i, message: 'has rent concessions!' },
  { regex: /net\s*effective/i, message: 'advertises net effective rent (look for concessions)!' },
  { regex: /discount/i, message: 'mentions a discount!' },
  { regex: /reduced\s*(rent|price)/i, message: 'has reduced rent!' },
];

function detectIncentives(description: string): string | null {
  if (!description) return null;
  for (const { regex, message } of INCENTIVE_PATTERNS) {
    if (regex.test(description)) return message;
  }
  return null;
}

// Generate empathetic commentary
function buildHeedTake(listing: Listing, answers: Answers, score: number, warnings: string[]): string {
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
    const pctOver = Math.round((over / answers.budget) * 100);
    parts.push(`$${over.toLocaleString()}/mo over budget (${pctOver}%), but might be worth stretching for`);
  }

  // Bedroom match
  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (listing.bedrooms === needed || (answers.bedrooms === '3+' && listing.bedrooms >= 3)) {
    parts.push(`exactly the ${formatBedrooms(listing.bedrooms).toLowerCase()} you wanted`);
  } else if (Math.abs(listing.bedrooms - needed) === 1) {
    parts.push(`${formatBedrooms(listing.bedrooms).toLowerCase()} (close to what you wanted)`);
  }

  // Location match
  if (answers.boroughs.length > 0) {
    const boroughLower = (listing.borough || '').toLowerCase();
    const neighborhoodLower = (listing.neighborhood || '').toLowerCase();
    const inPreferred = answers.boroughs.some(
      b => boroughLower.includes(b.toLowerCase()) || neighborhoodLower.includes(b.toLowerCase())
    );
    if (inPreferred) {
      parts.push(`in your preferred ${listing.borough} area`);
    } else if (warnings.some(w => w.includes('borough'))) {
      parts.push(`not your usual borough, but worth a look`);
    }
  }

  // Pet situation
  if (answers.pets !== 'none' && listing.pets?.toLowerCase() === 'yes') {
    parts.push('pets welcome here');
  }

  // Incentive detection from description
  const incentive = detectIncentives(listing.description);
  if (incentive) {
    parts.push(`Plus, ${incentive}`);
  }

  // Build the final message
  if (parts.length === 0) {
    return score >= 80
      ? `This ${neighborhood} listing hits most of your criteria. Worth a serious look!`
      : `This one doesn't match everything, but ${neighborhood} has its perks. Keep exploring!`;
  }

  const intro = score >= 80 ? 'Great match!' : score >= 60 ? 'Solid option.' : warnings.length > 0 ? 'Close enough?' : 'Interesting option.';
  return `${intro} ${parts.join(', ')}.`;
}

export default function DecisionListingCard({ listing, answers, matchScore, recommendation, warnings = [] }: Props) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [listing.id]);

  const rawImageUrl = listing.image_url || listing.images?.[0] || '';
  const hasValidImage = rawImageUrl && !rawImageUrl.includes('add7ffb');
  const heedTake = buildHeedTake(listing, answers, matchScore, warnings);

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
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500">
            <svg className="w-12 h-12 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-bold uppercase">No photo — check full listing</span>
          </div>
        )}

        {/* Price Tag - Top Right */}
        <div className="absolute top-2 right-2 bg-[#00A651] text-white font-bold text-sm sm:text-lg px-2 sm:px-3 py-1 border-2 border-black whitespace-nowrap">
          ${listing.price?.toLocaleString()}/MO
        </div>

        {/* Recommendation Badge - Top Left */}
        <div className={`absolute top-2 left-2 font-bold text-xs sm:text-sm px-2 sm:px-3 py-1 border-2 border-black max-w-[50%] leading-tight ${
          recommendation === 'ACT_NOW'
            ? 'bg-[#00A651] text-white'
            : 'bg-amber-400 text-black'
        }`}>
          {recommendation === 'ACT_NOW' ? 'ACT NOW' : 'WAIT'}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Neighborhood - Bold Italic Uppercase */}
        <h2 className="text-xl sm:text-2xl font-bold italic uppercase tracking-tight text-black">
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
              PETS OK
            </span>
          )}
        </div>

        {/* Warnings (from relaxed filters) */}
        {warnings.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {warnings.map((w, i) => (
              <span key={i} className="text-xs font-bold px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-800">
                {w}
              </span>
            ))}
          </div>
        )}

        {/* Match Score Bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold uppercase">Match Score</span>
            <span className="text-sm font-bold">{matchScore}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 border-2 border-black">
            <div
              className={`h-full transition-all duration-500 ${
                matchScore >= 80 ? 'bg-[#00A651]' : matchScore >= 50 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>

        {/* Heed's Take */}
        <div className="mt-3 p-3 border-2 border-black bg-[#1E3A8A]/5 flex-1">
          <div className="flex items-start gap-3">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Heed"
              className="w-10 h-10 rounded-full border-2 border-black object-cover shrink-0"
            />
            <div>
              <p className="text-xs font-bold uppercase mb-1 text-[#1E3A8A]">HEED&apos;S TAKE</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {heedTake}
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

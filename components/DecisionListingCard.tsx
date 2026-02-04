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

const HIGH_VELOCITY = ['manhattan', 'williamsburg', 'greenpoint', 'dumbo', 'park slope', 'cobble hill', 'brooklyn heights', 'long island city', 'astoria'];
const MODERATE_VELOCITY = ['bushwick', 'bed-stuy', 'crown heights', 'prospect heights', 'harlem', 'washington heights', 'jackson heights', 'sunnyside', 'fort greene', 'clinton hill'];

function getMarketVelocity(listing: Listing): string {
  const area = (listing.neighborhood || listing.borough || '').toLowerCase();
  if (HIGH_VELOCITY.some(h => area.includes(h))) {
    return `High — inventory in ${listing.neighborhood || listing.borough} moves rapidly.`;
  }
  if (MODERATE_VELOCITY.some(m => area.includes(m))) {
    return 'Moderate — standard turnover rate for NYC.';
  }
  return `Low — demand in ${listing.neighborhood || listing.borough} is stable.`;
}

function buildPepeFacts(listing: Listing, answers: Answers): string {
  const facts: string[] = [];

  if (listing.price <= answers.budget) {
    const pct = Math.round(((answers.budget - listing.price) / answers.budget) * 100);
    facts.push(pct > 0 ? `${pct}% below budget.` : 'At budget.');
  } else {
    const pct = Math.round(((listing.price - answers.budget) / answers.budget) * 100);
    facts.push(`${pct}% above budget.`);
  }

  if (answers.boroughs.length > 0) {
    const inPreferred = answers.boroughs.some(
      b => listing.borough?.toLowerCase().includes(b.toLowerCase()) ||
           listing.neighborhood?.toLowerCase().includes(b.toLowerCase())
    );
    facts.push(inPreferred ? 'In preferred area.' : 'Outside preferred boroughs.');
  }

  if (answers.pets !== 'none') {
    facts.push(listing.pets?.toLowerCase() === 'yes' ? 'Pets OK.' : 'Pet policy unconfirmed.');
  }

  return facts.join(' ');
}

export default function DecisionListingCard({ listing, answers }: Props) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 120);
    return () => clearTimeout(timer);
  }, [listing.id]);

  const rawImageUrl = listing.image_url || listing.images?.[0] || '';
  const hasValidImage = rawImageUrl && !rawImageUrl.includes('add7ffb');
  const velocity = getMarketVelocity(listing);
  const pepeFacts = buildPepeFacts(listing, answers);

  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm transition-opacity duration-120 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {/* Image 4:3 */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {hasValidImage ? (
          <img
            key={`img-${listing.id}`}
            src={rawImageUrl}
            alt={listing.neighborhood}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-sm">No photo available</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-[#00A651] text-white font-semibold text-sm px-2.5 py-1 rounded-lg">
          ${listing.price?.toLocaleString()}/mo
        </div>
      </div>

      {/* Content — compact */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* Location + specs */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 leading-tight">
            {listing.neighborhood}
            {listing.borough && listing.borough !== listing.neighborhood && (
              <span className="text-gray-400 font-normal"> · {listing.borough}</span>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatBedrooms(listing.bedrooms)} · {formatBathrooms(listing.bathrooms)}
            {listing.pets?.toLowerCase() === 'yes' && ' · Pets OK'}
          </p>
        </div>

        {/* Market Velocity — single line */}
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">Market velocity:</span> {velocity}
        </p>

        {/* Pepe's Take — inline */}
        <div className="flex items-start gap-2">
          <img
            src="/brand/pepe-ny.jpeg"
            alt="Pepe"
            className="w-6 h-6 rounded-full object-cover border border-gray-200 shrink-0 mt-0.5"
          />
          <p className="text-xs text-gray-600 leading-relaxed">
            {pepeFacts}
          </p>
        </div>

        {/* Description — one line */}
        {listing.description && (
          <p className="text-xs text-gray-400 line-clamp-1">
            {listing.description}
          </p>
        )}
      </div>
    </div>
  );
}

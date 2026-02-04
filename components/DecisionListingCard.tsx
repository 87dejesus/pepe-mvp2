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

// High-demand areas in NYC
const HIGH_VELOCITY = ['manhattan', 'williamsburg', 'greenpoint', 'dumbo', 'park slope', 'cobble hill', 'brooklyn heights', 'long island city', 'astoria'];
const MODERATE_VELOCITY = ['bushwick', 'bed-stuy', 'crown heights', 'prospect heights', 'harlem', 'washington heights', 'jackson heights', 'sunnyside', 'fort greene', 'clinton hill'];

function getMarketVelocity(listing: Listing): { level: string; text: string } {
  const area = (listing.neighborhood || listing.borough || '').toLowerCase();

  if (HIGH_VELOCITY.some(h => area.includes(h))) {
    return {
      level: 'High',
      text: `Market Velocity: High. Inventory in ${listing.neighborhood || listing.borough} moves rapidly. Most listings rotate quickly.`,
    };
  }
  if (MODERATE_VELOCITY.some(m => area.includes(m))) {
    return {
      level: 'Moderate',
      text: `Market Velocity: Moderate. This area reflects the standard turnover rate for NYC.`,
    };
  }
  return {
    level: 'Low',
    text: `Market Velocity: Low. Demand in ${listing.neighborhood || listing.borough} is currently stable compared to more central hubs.`,
  };
}

function buildPepeFacts(listing: Listing, answers: Answers): string {
  const facts: string[] = [];

  // Price vs budget
  if (listing.price <= answers.budget) {
    const pct = Math.round(((answers.budget - listing.price) / answers.budget) * 100);
    if (pct > 0) {
      facts.push(`Price is ${pct}% below your stated budget.`);
    } else {
      facts.push('Price matches your stated budget exactly.');
    }
  } else {
    const pct = Math.round(((listing.price - answers.budget) / answers.budget) * 100);
    facts.push(`Price is ${pct}% above your stated budget.`);
  }

  // Borough match
  if (answers.boroughs.length > 0) {
    const inPreferred = answers.boroughs.some(
      b => listing.borough?.toLowerCase().includes(b.toLowerCase()) ||
           listing.neighborhood?.toLowerCase().includes(b.toLowerCase())
    );
    if (inPreferred) {
      facts.push('Located in one of your preferred areas.');
    } else {
      facts.push('Outside your preferred boroughs.');
    }
  }

  // Pets
  if (answers.pets !== 'none') {
    const petsAllowed = listing.pets?.toLowerCase() === 'yes';
    facts.push(petsAllowed ? 'Pets allowed.' : 'Pet policy not confirmed.');
  }

  return facts.join(' ');
}

export default function DecisionListingCard({ listing, answers }: Props) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [listing.id]);

  const imageUrl = listing.image_url || listing.images?.[0] || '';
  const velocity = getMarketVelocity(listing);
  const pepeFacts = buildPepeFacts(listing, answers);

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
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-sm">No photo available</span>
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

        {/* Market Velocity */}
        <div className="rounded-lg p-3 bg-gray-50">
          <p className="text-sm text-gray-600 leading-relaxed">
            {velocity.text}
          </p>
        </div>

        {/* Pepe's Take */}
        <div className="rounded-lg p-3 bg-gray-50">
          <div className="flex items-start gap-3">
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Pepe"
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Pepe's take
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {pepeFacts}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-gray-500 line-clamp-2">
            {listing.description}
          </p>
        )}
      </div>
    </div>
  );
}

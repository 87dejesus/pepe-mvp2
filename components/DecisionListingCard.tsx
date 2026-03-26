'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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
  if (n === 0) return 'Studio';
  if (n === 1) return '1 bed';
  return `${n} beds`;
}

function formatBathrooms(n: number): string {
  if (n === 1) return '1 bath';
  return `${n} baths`;
}

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

function getTransitNote(borough: string): string {
  const b = (borough || '').toLowerCase();
  if (b.includes('manhattan')) return 'Subway station ~3–5 min walk';
  if (b.includes('brooklyn')) return 'Subway station ~5–10 min walk';
  if (b.includes('queens')) return 'Subway station ~8–12 min walk';
  if (b.includes('bronx')) return 'Bus or subway ~10–15 min walk';
  return 'Transit nearby';
}

function buildHeedTake(listing: Listing, answers: Answers, score: number, warnings: string[]): string {
  const parts: string[] = [];
  const neighborhood = listing.neighborhood || listing.borough || 'this area';

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
    parts.push(`$${over.toLocaleString()}/mo over budget (${pctOver}%) — worth considering if the fit feels right`);
  }

  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  if (listing.bedrooms === needed || (answers.bedrooms === '3+' && listing.bedrooms >= 3)) {
    parts.push(`exactly the ${formatBedrooms(listing.bedrooms)} you wanted`);
  } else if (Math.abs(listing.bedrooms - needed) === 1) {
    parts.push(`${formatBedrooms(listing.bedrooms)} (close to what you wanted)`);
  }

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

  if (answers.pets !== 'none' && listing.pets?.toLowerCase() === 'yes') {
    parts.push('pets welcome here');
  }

  const incentive = detectIncentives(listing.description);
  if (incentive) {
    parts.push(`Plus, ${incentive}`);
  }

  if (parts.length === 0) {
    return score >= 80
      ? `This ${neighborhood} listing hits most of your criteria. Worth a serious look!`
      : `This one doesn't match everything, but ${neighborhood} has its perks. Keep exploring!`;
  }

  const intro = score >= 80 ? 'Great match!' : score >= 60 ? 'Solid option.' : warnings.length > 0 ? 'Close enough?' : 'Interesting option.';
  return `${intro} ${parts.join(', ')}.`;
}

function buildBullets(
  listing: Listing,
  answers: Answers,
  warnings: string[],
): { color: string; text: string }[] {
  const bullets: { color: string; text: string }[] = [];

  const price = Number(String(listing.price || 0).replace(/[^0-9.]/g, '')) || 0;
  if (price <= answers.budget) {
    const savings = answers.budget - price;
    if (savings > 100) {
      bullets.push({ color: '#00A651', text: `$${savings.toLocaleString()}/mo under your budget` });
    } else {
      bullets.push({ color: '#00A651', text: 'Fits your budget' });
    }
  } else {
    const over = price - answers.budget;
    bullets.push({ color: '#ef4444', text: `$${over.toLocaleString()}/mo over your budget` });
  }

  const bedroomMap: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3+': 3 };
  const needed = bedroomMap[answers.bedrooms] ?? 1;
  const isExactBed = answers.bedrooms === '3+' ? listing.bedrooms >= 3 : listing.bedrooms === needed;
  if (isExactBed) {
    bullets.push({ color: '#00A651', text: `Exact match — ${formatBedrooms(listing.bedrooms)}` });
  } else {
    const wantedLabel = answers.bedrooms === '0' ? 'Studio' : `${answers.bedrooms} bed`;
    bullets.push({ color: '#f59e0b', text: `${formatBedrooms(listing.bedrooms)} (you wanted ${wantedLabel})` });
  }

  if (listing.pets === 'Allowed') {
    bullets.push({ color: '#00A651', text: 'Pet friendly — no need to hide your furry friend' });
  } else if (listing.pets === 'Not allowed') {
    bullets.push({ color: '#ef4444', text: 'No pets allowed — confirm before applying' });
  }

  bullets.push({ color: '#f59e0b', text: getTransitNote(listing.borough) });

  const price2 = Number(String(listing.price || 0).replace(/[^0-9.]/g, '')) || 0;
  if (price2 < answers.budget * 0.9) {
    bullets.push({ color: '#ef4444', text: `If you pass: next comparable unit in ${listing.borough || 'this area'} likely costs more` });
  } else if (detectIncentives(listing.description)) {
    bullets.push({ color: '#ef4444', text: 'Incentive may not be available on the next listing' });
  } else if (warnings.length > 0) {
    bullets.push({ color: '#ef4444', text: 'This listing has flags — but so might the next one' });
  }

  return bullets;
}

export default function DecisionListingCard({ listing, answers, matchScore, recommendation, warnings = [] }: Props) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [listing.id]);

  const rawImageUrl = (listing.image_url || listing.images?.[0] || '').trim();
  const hasValidImage =
    !!rawImageUrl &&
    (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) &&
    !rawImageUrl.includes('add7ffb');
  const heedTake = buildHeedTake(listing, answers, matchScore, warnings);
  const bullets = buildBullets(listing, answers, warnings);
  const showGuarantor = answers.budget <= 2500;
  const boroughLabel = listing.neighborhood || listing.borough || 'your area';
  const verdictText = recommendation === 'ACT_NOW'
    ? 'Strong match — this one fits your criteria well.'
    : 'Good option — compare a few more before deciding.';

  return (
    <div
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.15s',
        backgroundColor: 'white',
        borderRadius: '0 0 16px 16px',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
        {hasValidImage ? (
          <img
            key={`img-${listing.id}`}
            src={rawImageUrl}
            alt={listing.neighborhood}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #10263d 0%, #1a3a5c 55%, #29557c 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 20px',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at top left, rgba(255,255,255,0.12), transparent 42%), radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 38%)',
              }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: 320,
                width: '100%',
                border: '1px solid rgba(255,255,255,0.16)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '18px 16px',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.72, margin: '0 auto 12px auto', display: 'block' }}>
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 21V12h6v9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ margin: 0, marginBottom: 8, fontSize: 18, lineHeight: 1.2, fontWeight: 700, color: 'white' }}>
                Photos unavailable
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)' }}>
                Photos unavailable for this listing. Tap See listing details to view photos and more information.
              </p>
            </div>
          </div>
        )}

        {recommendation === 'ACT_NOW' && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: '#00A651',
              color: 'white',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.3px',
            }}
          >
            Strong match
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'white',
            color: '#0A2540',
            borderRadius: 20,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          ${listing.price?.toLocaleString()}/mo
        </div>
      </div>

      <div style={{ padding: 16, backgroundColor: 'white' }}>
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', margin: 0, marginBottom: 2, lineHeight: 1.2 }}>
            {listing.neighborhood || 'Unknown'}
          </h2>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
            {[listing.borough, formatBedrooms(listing.bedrooms), formatBathrooms(listing.bathrooms)].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ backgroundColor: '#f0f0f0', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#444' }}>
            {formatBedrooms(listing.bedrooms)}
          </span>
          <span style={{ backgroundColor: '#f0f0f0', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#444' }}>
            {formatBathrooms(listing.bathrooms)}
          </span>
          {listing.pets === 'Allowed' && (
            <span style={{ backgroundColor: '#EAF3DE', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#3B6D11', fontWeight: 600 }}>
              🐾 Pet friendly
            </span>
          )}
          {listing.pets === 'Not allowed' && (
            <span style={{ backgroundColor: '#FCEBEB', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#A32D2D', fontWeight: 600 }}>
              🚫 No pets
            </span>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#888' }}>Match score</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00A651' }}>{matchScore}%</span>
          </div>
          <div style={{ height: 4, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                width: `${matchScore}%`,
                backgroundColor: matchScore >= 80 ? '#00A651' : matchScore >= 50 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.5s',
              }}
            />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8f9fb',
            border: '1px solid #e8edf3',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Image src="/brand/heed-mascot.png" alt="Heed" width={36} height={36} style={{ objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0A2540' }}>Heed&apos;s Take</span>
          </div>

          <p style={{ fontSize: 12, color: '#333', lineHeight: 1.5, margin: 0, marginBottom: 8 }}>
            {heedTake}
          </p>

          <div style={{ height: 1, backgroundColor: '#e8edf3', marginBottom: 8 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: b.color,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                <span style={{ fontSize: 11, color: '#555', lineHeight: 1.45 }}>{b.text}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, backgroundColor: '#e8edf3', marginBottom: 8 }} />

          {warnings.length > 0 && (
            <div
              style={{
                backgroundColor: '#fff5f2',
                border: '1px solid #f5c4b3',
                borderRadius: 8,
                padding: '8px 10px',
                marginBottom: 8,
              }}
            >
              {warnings.map((w, i) => (
                <p key={i} style={{ fontSize: 11, color: '#c0522a', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          <div
            style={{
              backgroundColor: '#EAF3DE',
              border: '1px solid #C0DD97',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, color: '#3a7a2a', margin: 0 }}>
              {verdictText}
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8f9fb',
            border: '1px solid #e8edf3',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: showGuarantor ? 8 : 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', color: '#aaa', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
              STORAGE
            </span>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0A2540', margin: 0, marginBottom: 2, lineHeight: 1.3 }}>
              Need storage during your move?
            </p>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
              Climate-controlled units near {boroughLabel}
            </p>
          </div>
          <button
            onClick={() => window.open('https://www.makespace.com', '_blank')}
            style={{
              backgroundColor: '#0A2540',
              color: 'white',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Find →
          </button>
        </div>

        {showGuarantor && (
          <div
            style={{
              backgroundColor: '#f8f9fb',
              border: '1px solid #e8edf3',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', color: '#aaa', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                GUARANTOR
              </span>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0A2540', margin: 0, marginBottom: 2, lineHeight: 1.3 }}>
                Need income verification help?
              </p>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                Qualify faster with a guarantor service
              </p>
            </div>
            <button
              onClick={() => window.open('https://www.insurent.com', '_blank')}
              style={{
                backgroundColor: '#0A2540',
                color: 'white',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Learn →
            </button>
          </div>
        )}

        {listing.description && (
          <p
            style={{
              fontSize: 12,
              color: '#666',
              lineHeight: 1.6,
              marginTop: 10,
              marginBottom: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {listing.description}
          </p>
        )}
      </div>
    </div>
  );
}

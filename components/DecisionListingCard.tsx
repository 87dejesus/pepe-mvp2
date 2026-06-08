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
  transit?: string;
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

const CASLON = 'var(--font-caslon), Georgia, "Times New Roman", serif';
const NAVY = '#0A2540';
const GREEN = '#00A651';
const CLAY = '#C8814B';
const LINE = 'rgba(255,255,255,.14)';

// ─── small helpers ──────────────────────────────────────────────────────────────
function formatBeds(n: number): string {
  if (n === 0) return 'Studio';
  if (n === 1) return '1 bed';
  return `${n} beds`;
}
function bedNeeded(a: string): number {
  return ({ '0': 0, '1': 1, '2': 2, '3+': 3 } as Record<string, number>)[a] ?? 1;
}
function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

const INCENTIVE_PATTERNS: { regex: RegExp; message: string }[] = [
  { regex: /(\d+)\s*months?\s*free/i, message: 'a free month on offer' },
  { regex: /free\s*months?/i, message: 'a free month on offer' },
  { regex: /no\s*(broker\s*)?fee/i, message: 'no broker fee' },
  { regex: /move[- ]?in\s*special/i, message: 'a move-in special' },
  { regex: /concession/i, message: 'rent concessions' },
];
function detectIncentive(desc: string): string | null {
  for (const p of INCENTIVE_PATTERNS) if (p.regex.test(desc || '')) return p.message;
  return null;
}

function inPreferredBorough(listing: Listing, answers: Answers): boolean {
  if (!answers.boroughs.length) return true;
  const b = (listing.borough || '').toLowerCase();
  const n = (listing.neighborhood || '').toLowerCase();
  return answers.boroughs.some((x) => b.includes(x.toLowerCase()) || n.includes(x.toLowerCase()));
}

// Honest borough-level transit estimate. Real per-listing subway data
// (nearest line + walk time from the saswave `transportation` field) is the
// next follow-up; until it is stored we avoid inventing a specific line.
function transitNote(borough: string): string {
  const b = (borough || '').toLowerCase();
  if (b.includes('manhattan')) return 'Subway roughly 3-5 min walk';
  if (b.includes('brooklyn')) return 'Subway roughly 5-10 min walk';
  if (b.includes('queens')) return 'Subway roughly 8-12 min walk';
  if (b.includes('bronx')) return 'Bus or subway roughly 10-15 min walk';
  return 'Transit nearby';
}

type Status = 'met' | 'warn' | 'miss';
type Criterion = { key: string; value: string; status: Status };

function buildScorecard(listing: Listing, answers: Answers): Criterion[] {
  const out: Criterion[] = [];

  // Budget
  if (!listing.price || listing.price <= 0) {
    out.push({ key: 'Budget', value: 'Ask building', status: 'warn' });
  } else if (listing.price <= answers.budget) {
    out.push({ key: 'Budget', value: `Under ${money(answers.budget)}`, status: 'met' });
  } else {
    out.push({ key: 'Budget', value: `${money(listing.price - answers.budget)} over`, status: 'miss' });
  }

  // Bedrooms
  const needed = bedNeeded(answers.bedrooms);
  const exact = answers.bedrooms === '3+' ? listing.bedrooms >= 3 : listing.bedrooms === needed;
  if (exact) {
    out.push({ key: 'Bedrooms', value: `${formatBeds(listing.bedrooms)} · exact`, status: 'met' });
  } else if (Math.abs(listing.bedrooms - needed) === 1) {
    out.push({ key: 'Bedrooms', value: formatBeds(listing.bedrooms), status: 'warn' });
  } else {
    out.push({ key: 'Bedrooms', value: formatBeds(listing.bedrooms), status: 'miss' });
  }

  // Borough
  if (!answers.boroughs.length) {
    out.push({ key: 'Borough', value: listing.borough || 'NYC', status: 'met' });
  } else if (inPreferredBorough(listing, answers)) {
    out.push({ key: 'Borough', value: listing.borough, status: 'met' });
  } else {
    out.push({ key: 'Borough', value: `${listing.borough}`, status: 'miss' });
  }

  // Pets
  const petLc = (listing.pets || '').toLowerCase();
  if (answers.pets === 'none') {
    out.push({ key: 'Pets', value: 'Not needed', status: 'met' });
  } else if (petLc === 'allowed' || petLc === 'yes') {
    out.push({ key: 'Pets', value: 'Allowed', status: 'met' });
  } else if (petLc === 'not allowed' || petLc === 'no') {
    out.push({ key: 'Pets', value: 'Not allowed', status: 'miss' });
  } else {
    out.push({ key: 'Pets', value: 'Confirm w/ building', status: 'warn' });
  }

  return out;
}

function buildLedger(listing: Listing, answers: Answers, sc: Criterion[]) {
  const gains: string[] = [];
  const gives: string[] = [];

  const budget = sc.find((c) => c.key === 'Budget')!;
  if (budget.status === 'met' && listing.price > 0) {
    const under = answers.budget - listing.price;
    if (under >= 100) gains.push(`${money(under)}/mo back in your pocket`);
    else gains.push('Sits right inside your budget');
  } else if (budget.status === 'miss') {
    gives.push(`${money(listing.price - answers.budget)}/mo over your budget`);
  }

  const beds = sc.find((c) => c.key === 'Bedrooms')!;
  if (beds.status === 'met') gains.push(`Exactly the ${formatBeds(listing.bedrooms)} you wanted`);
  else gives.push(`${formatBeds(listing.bedrooms)}, not your ${formatBeds(bedNeeded(answers.bedrooms))}`);

  const boro = sc.find((c) => c.key === 'Borough')!;
  if (boro.status === 'met' && answers.boroughs.length) gains.push(`In ${listing.borough}, your area`);
  else if (boro.status === 'miss') gives.push(`${listing.borough}, outside your boroughs`);

  const pets = sc.find((c) => c.key === 'Pets')!;
  if (pets.status === 'miss') gives.push('No pets allowed');
  else if (pets.status === 'warn' && answers.pets !== 'none') gives.push('Pet policy not confirmed');

  const incentive = detectIncentive(listing.description);
  if (incentive && gains.length < 3) gains.push(`Plus ${incentive}`);

  if (!gives.length) gives.push('Confirm the commute fits your routine');

  return { gains: gains.slice(0, 3), gives: gives.slice(0, 3) };
}

function verdictOf(score: number): { stamp: string; headline: string } {
  if (score >= 80) return { stamp: 'Strong match', headline: 'A genuinely steady pick.' };
  if (score >= 60) return { stamp: 'Worth a look', headline: 'Worth a serious look.' };
  return { stamp: 'A stretch', headline: 'A stretch, but read the tradeoff.' };
}

function heedTake(listing: Listing, sc: Criterion[], score: number): string {
  const misses = sc.filter((c) => c.status === 'miss');
  const warns = sc.filter((c) => c.status === 'warn');
  if (misses.length === 0 && warns.length === 0) {
    return 'Nothing here breaks your rules. If the commute fits your life, this is a quiet yes.';
  }
  if (misses.length === 0) {
    return `Nothing here breaks your rules. Just confirm the ${warns[0].key.toLowerCase()} and you are clear.`;
  }
  if (score >= 60) {
    return `Close, but it gives up ${misses[0].key.toLowerCase()}. Worth it only if the gains below matter more to you.`;
  }
  return `This one bends a few of your lines. Keep it only if you are knowingly trading them away.`;
}

// ─── component ───────────────────────────────────────────────────────────────────
export default function DecisionListingCard({ listing, answers, matchScore }: Props) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    setFade(true);
    const t = setTimeout(() => setFade(false), 160);
    return () => clearTimeout(t);
  }, [listing.id]);

  const rawImg = (listing.image_url || listing.images?.[0] || '').trim();
  const hasImg = !!rawImg && rawImg.startsWith('http') && !rawImg.includes('add7ffb');

  const verdict = verdictOf(matchScore);
  const scorecard = buildScorecard(listing, answers);
  const { gains, gives } = buildLedger(listing, answers, scorecard);
  const take = heedTake(listing, scorecard, matchScore);
  const neighborhood = listing.neighborhood || listing.borough || 'this area';

  const priceLine =
    !listing.price || listing.price <= 0
      ? { text: 'Contact for pricing', color: 'rgba(255,255,255,.55)' }
      : listing.price <= answers.budget
      ? { text: `${money(answers.budget - listing.price)} under your ceiling`, color: GREEN }
      : { text: `${money(listing.price - answers.budget)} over your ceiling`, color: CLAY };

  const tickColor = (s: Status) => (s === 'met' ? GREEN : s === 'warn' ? CLAY : '#d4504a');
  const tickGlyph = (s: Status) => (s === 'met' ? '✓' : s === 'warn' ? '?' : '✕');

  return (
    <div
      style={{
        opacity: fade ? 0 : 1,
        transition: 'opacity .16s',
        background: NAVY,
        border: `1px solid ${LINE}`,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 16px 50px rgba(0,0,0,.4)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      {/* Photo */}
      <div style={{ position: 'relative', height: 220, background: '#16384f' }}>
        {hasImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rawImg} alt={neighborhood} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/brand/heed-mascot.png" alt="Heed" style={{ height: 96, width: 'auto', opacity: 0.85 }} /></div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(7,27,48,.1) 0%,rgba(7,27,48,0) 35%,rgba(7,27,48,.85) 100%)' }} />
        <span style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, background: 'rgba(7,27,48,.72)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)' }}>
          {listing.borough}
        </span>
        <span style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 5, background: matchScore >= 80 ? GREEN : 'rgba(7,27,48,.8)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 999, border: matchScore >= 80 ? 'none' : '1px solid rgba(255,255,255,.2)' }}>
          ★ {verdict.stamp}
        </span>
      </div>

      {/* Headline */}
      <div style={{ padding: '18px 20px 4px' }}>
        <div style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 7 }}>
          {neighborhood} · the verdict
        </div>
        <h1 style={{ fontFamily: CASLON, color: '#fff', fontSize: 29, lineHeight: 1.07, fontWeight: 400, margin: 0 }}>
          {verdict.headline}
        </h1>
      </div>

      {/* Price strip */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '14px 20px', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, marginTop: 14 }}>
        <span style={{ fontFamily: CASLON, color: '#fff', fontSize: 25 }}>
          {listing.price > 0 ? money(listing.price) : 'Call for rent'}
        </span>
        {listing.price > 0 && <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>/ month</span>}
        <span style={{ marginLeft: 'auto', color: priceLine.color, fontSize: 12.5, fontWeight: 600 }}>{priceLine.text}</span>
      </div>

      {/* Non-negotiables */}
      <div style={{ padding: '16px 20px' }}>
        <h2 style={sectionLabel}>Your non-negotiables</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {scorecard.map((c) => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 11, padding: '10px 11px' }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', background: tickColor(c.status) }}>
                {tickGlyph(c.status)}
              </span>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.key}</div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginTop: 1 }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tradeoff ledger */}
      <div style={{ padding: '0 20px 16px' }}>
        <h2 style={sectionLabel}>The tradeoff</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 14px', background: 'rgba(0,166,81,.08)' }}>
            <div style={{ ...ledgerTitle, color: GREEN }}>You gain</div>
            <ul style={{ margin: 0, padding: 0 }}>
              {gains.map((g, i) => (
                <li key={i} style={ledgerItem}><span style={{ color: GREEN, fontWeight: 700, position: 'absolute', left: 0 }}>+</span>{g}</li>
              ))}
            </ul>
          </div>
          <div style={{ padding: '13px 14px', background: 'rgba(200,129,75,.09)', borderLeft: `1px solid ${LINE}` }}>
            <div style={{ ...ledgerTitle, color: CLAY }}>You give up</div>
            <ul style={{ margin: 0, padding: 0 }}>
              {gives.map((g, i) => (
                <li key={i} style={ledgerItem}><span style={{ color: CLAY, fontWeight: 700, position: 'absolute', left: 0 }}>–</span>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Transit — real nearest-subway from saswave when present, else borough estimate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 20px', borderTop: `1px solid ${LINE}`, color: 'rgba(255,255,255,.7)', fontSize: 13 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: listing.transit ? '#fccc0a' : 'rgba(255,255,255,.12)', color: listing.transit ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 12, fontWeight: 800 }}>
          {listing.transit ? 'M' : '↑'}
        </span>
        {listing.transit || transitNote(listing.borough)}
      </div>

      {/* Heed's take */}
      <div style={{ display: 'flex', gap: 12, margin: '4px 20px 20px', padding: '14px 16px', background: 'rgba(255,255,255,.05)', borderLeft: `3px solid ${GREEN}`, borderRadius: '0 12px 12px 0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/heed-mascot.png" alt="Heed" style={{ height: 44, width: 'auto', flex: 'none', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.4))' }} />
        <div>
          <div style={{ fontFamily: CASLON, color: '#fff', fontSize: 15, lineHeight: 1.4, fontStyle: 'italic' }}>&ldquo;{take}&rdquo;</div>
          <div style={{ color: GREEN, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, marginTop: 6 }}>Heed&apos;s take</div>
        </div>
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,.45)',
  fontWeight: 700,
  marginBottom: 12,
  marginTop: 0,
};
const ledgerTitle: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  fontWeight: 700,
  marginBottom: 8,
};
const ledgerItem: React.CSSProperties = {
  listStyle: 'none',
  color: 'rgba(255,255,255,.82)',
  fontSize: 12.5,
  lineHeight: 1.5,
  paddingLeft: 14,
  position: 'relative',
  marginBottom: 4,
};

/**
 * AffiliateOffers — contextual partner tiles shown inside /decision.
 *
 * Rules (independent — both can appear simultaneously):
 *   Storage card:    budget >= $3,000
 *   Low-Credit card: budget < $2,800 OR matchScore < 75 OR finalCount < 6 OR forced
 *
 * All CTA clicks go through /api/track for attribution.
 * Styled for dark (#0A2540) background context.
 */

interface Props {
  budget: number;
  matchScore: number;
  showLowCreditForced?: boolean;
  finalCount?: number;
}

interface OfferTileProps {
  accentColor: string;
  label: string;
  title: string;
  pitch: string;
  cta: string;
  trackUrl: string;
}

function OfferTile({ accentColor, label, title, pitch, cta, trackUrl }: OfferTileProps) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.07] border border-white/20 rounded-xl px-4 py-3 overflow-hidden">
      {/* Left accent */}
      <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: accentColor }} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <span
          className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 leading-none"
          style={{ backgroundColor: accentColor, color: '#fff' }}
        >
          {label}
        </span>
        <p className="text-xs font-semibold text-white leading-tight">{title}</p>
        <p className="text-[11px] text-white/50 leading-tight mt-0.5 line-clamp-1">{pitch}</p>
      </div>

      {/* CTA */}
      <a
        href={trackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 bg-[#00A651] hover:bg-[#00913f] text-white text-[11px] font-semibold rounded-lg px-3 py-2 transition-colors whitespace-nowrap select-none"
      >
        {cta} →
      </a>
    </div>
  );
}

export default function AffiliateOffers({ budget, matchScore, showLowCreditForced = false, finalCount }: Props) {
  const showStorage = budget >= 3000;
  const showLowCredit =
    showLowCreditForced ||
    matchScore < 75 ||
    budget < 2800 ||
    (finalCount !== undefined && finalCount < 6);

  if (!showStorage && !showLowCredit) return null;

  const storageTrackUrl =
    `/api/track?partner=extraspace` +
    `&target_url=${encodeURIComponent('https://extraspace.com')}` +
    `&source=decision`;

  const lowCreditTrackUrl =
    `/api/track?partner=theguarantee` +
    `&target_url=${encodeURIComponent('https://theguarantee.com')}` +
    `&source=decision`;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-white/35 px-1">
        Tools for your move
      </p>

      {showStorage && (
        <OfferTile
          accentColor="#E84B2A"
          label="Storage"
          title="Need storage during your move?"
          pitch="Climate-controlled units near you — reserve in minutes"
          cta="Find Storage"
          trackUrl={storageTrackUrl}
        />
      )}

      {showLowCredit && (
        <OfferTile
          accentColor="#1E6AA8"
          label="Guarantor"
          title="Don't meet the 40× income rule?"
          pitch="The Guarantee vouches for you so landlords say yes"
          cta="Get Guaranteed"
          trackUrl={lowCreditTrackUrl}
        />
      )}
    </div>
  );
}

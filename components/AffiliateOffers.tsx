/**
 * AffiliateOffers — contextual partner tiles shown inside /decision.
 *
 * Rules:
 *   budget > 3000  → show Storage offer (Extra Space Storage)
 *   matchScore < 75 → show Low-Credit / guarantor offer (The Guarantee)
 *
 * All CTA clicks go through /api/track for attribution.
 */

interface Props {
  budget: number;
  matchScore: number;
}

interface OfferTileProps {
  badge: string;
  badgeColor: string;
  title: string;
  pitch: string;
  cta: string;
  trackUrl: string;
}

function OfferTile({ badge, badgeColor, title, pitch, cta, trackUrl }: OfferTileProps) {
  return (
    <div className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_black] flex overflow-hidden">
      {/* Left accent bar */}
      <div className="w-1.5 shrink-0" style={{ backgroundColor: badgeColor }} />

      {/* Content */}
      <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <span
            className="inline-block text-white text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 mb-1 leading-none"
            style={{ backgroundColor: badgeColor }}
          >
            {badge}
          </span>
          <p className="text-xs font-black text-black leading-tight">{title}</p>
          <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-1">{pitch}</p>
        </div>

        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 bg-black text-white text-[11px] font-black uppercase px-3 py-2 border-2 border-black hover:bg-[#00A651] transition-colors whitespace-nowrap select-none"
        >
          {cta} →
        </a>
      </div>
    </div>
  );
}

export default function AffiliateOffers({ budget, matchScore }: Props) {
  const showStorage = budget > 3000;
  const showLowCredit = matchScore < 75;

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
      <p className="text-[10px] font-black uppercase tracking-widest text-white/50 px-0.5">
        Tools for your move
      </p>

      {showStorage && (
        <OfferTile
          badge="STORAGE"
          badgeColor="#E84B2A"
          title="Need storage during your move?"
          pitch="Climate-controlled units near you — reserve in minutes"
          cta="Find Storage"
          trackUrl={storageTrackUrl}
        />
      )}

      {showLowCredit && (
        <OfferTile
          badge="GUARANTOR"
          badgeColor="#1E3A8A"
          title="Don't meet the 40x income rule?"
          pitch="The Guarantee vouches for you so landlords say yes"
          cta="Get Guaranteed"
          trackUrl={lowCreditTrackUrl}
        />
      )}
    </div>
  );
}

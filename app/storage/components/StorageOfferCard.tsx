import type { StoragePartner } from '../lib/storage-partners';

const CATEGORY_LABEL: Record<StoragePartner['category'], string> = {
  storage: 'Storage',
  financial: 'Move Tool',
};

const SERIF = 'var(--font-caslon), Georgia, serif';

export default function StorageOfferCard({
  id,
  name,
  tagline,
  description,
  cta,
  url,
  badge,
  accentColor,
  category,
}: StoragePartner) {
  const trackUrl = `/api/track?partner=${encodeURIComponent(id)}&target_url=${encodeURIComponent(url)}&source=storage`;

  return (
    <div className="bg-white/[0.04] border border-white/15 rounded-2xl overflow-hidden flex flex-col">
      {/* Thin partner-color accent strip */}
      <div className="h-[3px] w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 bg-white/[0.08] border border-white/15 rounded-md px-2 py-1">
            {badge}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
            {CATEGORY_LABEL[category]}
          </span>
        </div>

        <h3 className="text-lg text-white leading-tight" style={{ fontFamily: SERIF }}>
          {name}
        </h3>
        <p className="text-sm text-[#00A651] font-semibold mt-1">{tagline}</p>
        <p className="text-sm text-white/60 leading-relaxed mt-2 flex-1">{description}</p>

        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center w-full h-12 rounded-xl bg-[#00A651] text-white font-semibold text-sm hover:bg-[#00913f] active:scale-[0.98] transition-all select-none"
        >
          {cta} →
        </a>
      </div>
    </div>
  );
}

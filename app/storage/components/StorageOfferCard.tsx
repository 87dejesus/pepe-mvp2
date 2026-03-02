import type { StoragePartner } from '../lib/storage-partners';

const CATEGORY_LABEL: Record<StoragePartner['category'], string> = {
  storage: 'STORAGE',
  financial: 'MOVE TOOL',
};

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
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] flex flex-col">
      {/* Colored header strip */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: accentColor }}
      >
        <span className="text-white font-black text-xs uppercase tracking-widest">
          {badge}
        </span>
        <span className="text-white/70 text-xs font-bold uppercase">
          {CATEGORY_LABEL[category]}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <h3 className="font-black text-lg sm:text-xl text-black leading-tight mb-1">
          {name}
        </h3>
        <p className="font-bold text-sm text-gray-500 mb-3">{tagline}</p>
        <p className="text-sm text-gray-700 leading-relaxed flex-1 mb-5">
          {description}
        </p>

        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-black text-white font-black uppercase text-sm py-3 border-2 border-black shadow-[3px_3px_0px_0px] hover:bg-[#00A651] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all select-none"
          style={{ '--tw-shadow-color': accentColor } as React.CSSProperties}
        >
          {cta} →
        </a>
      </div>
    </div>
  );
}

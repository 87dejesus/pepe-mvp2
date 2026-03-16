import type { LowCreditPartner } from '../lib/low-credit-partners';

export default function LowCreditOfferCard({
  id,
  name,
  benefit,
  description,
  url,
  badge,
  accentColor,
}: LowCreditPartner) {
  const trackUrl =
    `/api/track?partner=${encodeURIComponent(id)}` +
    `&target_url=${encodeURIComponent(url)}` +
    `&source=low-credit`;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden">
      {/* Colored header strip */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: accentColor }}
      >
        <span className="text-white font-semibold text-xs uppercase tracking-wider">
          {badge}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-[#0A2540] leading-tight mb-1">
          {name}
        </h3>
        <p className="font-medium text-sm text-[#666666] mb-3">{benefit}</p>
        <p className="text-sm text-[#1A1A1A] leading-relaxed flex-1 mb-5">
          {description}
        </p>

        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full h-12 rounded-lg bg-[#0A2540] text-white font-semibold text-sm hover:bg-[#0d2f52] active:scale-[0.98] transition-all select-none"
        >
          Get Guaranteed Now →
        </a>
      </div>
    </div>
  );
}

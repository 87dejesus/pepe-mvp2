'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { OnboardingProgress } from '@/components/OnboardingProgress';

type FlowAnswers = {
  boroughs?: string[];
  budget?: number;
  bedrooms?: string;
  pets?: string;
};

export default function PreviewPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<FlowAnswers>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('heed_answers_v2');
      if (raw) setAnswers(JSON.parse(raw) as FlowAnswers);
    } catch {}
  }, []);

  // Personalise the fake listing from their flow answers
  const borough = answers.boroughs?.[0] ?? 'Brooklyn';
  const budget = answers.budget ?? 3500;
  const bedrooms = answers.bedrooms ?? '1';
  const bedroomLabel =
    bedrooms === '0' ? 'Studio' : `${bedrooms} Bedroom${bedrooms === '1' ? '' : 's'}`;
  const petsOk = answers.pets && answers.pets !== 'none';
  const listingPrice = Math.round(budget * 0.91 / 50) * 50; // slightly under budget

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 overflow-y-auto px-5 max-w-lg mx-auto w-full">
        <OnboardingProgress step={11} />

        {/* Heed speech bubble with bob animation */}
        <div className="flex items-start gap-3 mb-6">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={40}
            height={40}
            className="object-contain shrink-0 mt-0.5"
            style={{ animation: 'heedBob 3s ease-in-out infinite' }}
            unoptimized
          />
          <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-sm font-semibold text-[#0A2540] leading-snug">
              Try The Steady One for free
            </p>
            <p className="text-[11px] text-[#0A2540]/50 mt-0.5">
              Explore listings that match your priorities and decide with
              confidence. No payment today.
            </p>
          </div>
        </div>

        {/* Fake listing preview card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.28)] overflow-hidden mb-4">
          {/* Apartment image with overlay */}
          <div className="relative w-full h-64 rounded-xl overflow-hidden">
            <Image
              src="/preview/example-studio.jpg"
              alt="Example Manhattan Studio"
              fill
              className="object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Match score badge */}
            <div className="absolute top-3 right-3 bg-[#00A651] text-white rounded-lg px-2.5 py-1.5 text-center shadow-lg z-10">
              <div className="text-xl font-bold leading-none">82</div>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-90">
                Match
              </div>
            </div>

            {/* Title + details on image */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-0.5">
                {borough}
              </p>
              <h3 className="text-white font-bold text-base leading-tight">
                {bedroomLabel} · ${listingPrice.toLocaleString()}/mo
              </h3>
              <div className="flex items-center gap-2.5 text-xs text-white/70 mt-1 flex-wrap">
                <span>🛏 {bedroomLabel}</span>
                <span>·</span>
                <span>🐾 {petsOk ? 'Pets OK' : 'No pets'}</span>
                <span>·</span>
                <span className="text-[#00A651] font-semibold">No broker fee</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Heed's Take */}
            <div className="bg-[#F8F6F3] border-l-4 border-[#00A651] pl-4 py-3 rounded-r-lg">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00A651] mb-1">
                Heed&apos;s Take
              </p>
              <p className="text-xs text-[#1A1A1A] leading-relaxed">
                Strong match for your {borough} preference and budget. Commute
                to Midtown is ~28 min — solid at this price. No false urgency,
                but this type lists fast.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4 font-medium">
          This is a preview example based on your answers. Real listings update daily from NYC sources.
        </p>

        <div className="pb-4" />
      </div>

      <div className="px-5 pb-6 pt-3 max-w-lg mx-auto w-full">
        <button
          onClick={() => router.push('/onboarding/pricing')}
          className="w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] transition-all"
        >
          Explore my options
        </button>
      </div>

      <style>{`
        @keyframes heedBob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

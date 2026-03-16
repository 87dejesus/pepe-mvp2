'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { OnboardingProgress } from '@/components/OnboardingProgress';

export default function DecisionPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 overflow-y-auto px-5 max-w-lg mx-auto w-full">
        <OnboardingProgress step={10} />

        {/* Heed speech bubble */}
        <div className="flex items-start gap-3 mb-8">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={40}
            height={40}
            className="object-contain shrink-0 mt-0.5"
          />
          <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-sm font-semibold text-[#0A2540] leading-snug">
              Finding apartments is easy. Deciding is the hard part.
            </p>
          </div>
        </div>

        {/* Two-column comparison */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* SEARCH */}
          <div className="bg-white/[0.05] border border-white/15 rounded-2xl p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.08] flex items-center justify-center mb-3">
              <span className="text-2xl" style={{ filter: 'grayscale(0.6)' }}>
                🔍
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">
              Search
            </span>
            <p className="text-white/75 font-semibold text-sm mb-1.5">
              Find apartments
            </p>
            <p className="text-white/35 text-xs leading-snug">
              Endless listings, no clarity
            </p>
          </div>

          {/* DECISION */}
          <div className="bg-[#00A651]/[0.12] border border-[#00A651]/40 rounded-2xl p-5 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#00A651]/[0.2] flex items-center justify-center mb-3">
              <span className="text-2xl">⚖️</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00A651]/80 mb-2">
              Decision
            </span>
            <p className="text-white font-semibold text-sm mb-1.5">
              Understand trade-offs
            </p>
            <p className="text-white/55 text-xs leading-snug">
              Choose with clarity
            </p>
          </div>
        </div>

        <p className="text-white/40 text-sm text-center mb-4 leading-relaxed px-2">
          Heed turns the noise into a clear signal — so you decide once,
          confidently.
        </p>

        <div className="pb-4" />
      </div>

      <div className="px-5 pb-6 pt-3 max-w-lg mx-auto w-full">
        <button
          onClick={() => router.push('/onboarding/preview')}
          className="w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] transition-all"
        >
          Show me how it works
        </button>
      </div>
    </div>
  );
}

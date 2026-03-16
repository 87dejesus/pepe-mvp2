'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { OnboardingProgress } from '@/components/OnboardingProgress';

const TRADEOFFS = [
  {
    emoji: '🚇 💰',
    title: 'Commute vs Rent',
    body: 'A shorter commute often means higher rent. The "convenient" apartment could cost you hours or hundreds of dollars every month.',
  },
  {
    emoji: '📍 🏠',
    title: 'Location vs Space',
    body: 'Prime location usually means less square footage. A quieter neighborhood gets you the space you actually need.',
  },
  {
    emoji: '🛡️ 👥',
    title: 'Privacy vs Social life',
    body: 'A doorman building feels secure but less social. A walk-up has more community but less protection.',
  },
] as const;

export default function TradeoffsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 flex flex-col px-5 pb-8 max-w-lg mx-auto w-full">
        <OnboardingProgress step={9} />

        {/* Heed speech bubble */}
        <div className="flex items-start gap-3 mb-6">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={40}
            height={40}
            className="object-contain shrink-0 mt-0.5"
          />
          <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-sm font-semibold text-[#0A2540] leading-snug">
              Know your trade-offs
            </p>
            <p className="text-[11px] text-[#0A2540]/50 mt-0.5">
              Most people think they&apos;re choosing apartments. In reality,
              they&apos;re choosing trade-offs.
            </p>
          </div>
        </div>

        {/* Trade-off cards */}
        <div className="flex flex-col gap-3 mb-4">
          {TRADEOFFS.map((t) => (
            <div
              key={t.title}
              className="bg-white/[0.07] border border-white/20 rounded-2xl p-5"
            >
              <div className="text-2xl mb-2">{t.emoji}</div>
              <h3 className="text-white font-semibold text-base mb-1">
                {t.title}
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/onboarding/decision')}
          className="mt-auto w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] transition-all"
        >
          I understand
        </button>
      </div>
    </div>
  );
}

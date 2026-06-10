'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const SERIF = 'var(--font-caslon), Georgia, serif';

const TRADEOFFS = [
  {
    emoji: '🚇 💰',
    title: 'Commute vs Rent',
    body: 'A shorter commute often means higher rent. The convenient apartment can cost you hours or hundreds of dollars every month.',
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

      <div className="flex-1 overflow-y-auto px-5 max-w-lg mx-auto w-full">
        {/* Heed voice */}
        <div className="flex items-start gap-3 mb-6 mt-2">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={44}
            height={60}
            unoptimized
            className="object-contain shrink-0"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.4))' }}
          />
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#00A651] mb-1.5">
              Heed&apos;s take
            </div>
            <h1 className="text-white text-[26px] leading-[1.12]" style={{ fontFamily: SERIF }}>
              You&apos;re choosing tradeoffs, not apartments.
            </h1>
          </div>
        </div>

        {/* Trade-off cards */}
        <div className="flex flex-col gap-3 mb-4">
          {TRADEOFFS.map((t) => (
            <div
              key={t.title}
              className="bg-white/[0.04] border border-white/15 rounded-2xl p-5"
            >
              <div className="text-2xl mb-2">{t.emoji}</div>
              <h3 className="text-white font-semibold text-base mb-1">{t.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="pb-4" />
      </div>

      <div className="px-5 pb-6 pt-3 max-w-lg mx-auto w-full">
        <button
          onClick={() => router.push('/onboarding/preview')}
          className="w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] transition-all"
        >
          I understand
        </button>
      </div>
    </div>
  );
}

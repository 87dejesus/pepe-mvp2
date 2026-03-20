'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function DecisionPage() {
  const router = useRouter();

  const pct = Math.round((10 / 12) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#0A2540', overflow: 'hidden' }}>
      <Header />

      {/* Progress bar section */}
      <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Step 10 of 12</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{pct}%</span>
        </div>
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#00A651',
              borderRadius: 99,
              width: `${pct}%`,
              transition: 'width 0.5s',
            }}
          />
        </div>
      </div>

      {/* Content section */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>

        {/* Heed speech bubble */}
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A2540', lineHeight: 1.35, margin: 0 }}>
            Finding apartments is easy. Deciding is the hard part.
          </p>
        </div>

        {/* Two-column comparison cards */}
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

        {/* Tagline */}
        <p className="text-white/40 text-sm text-center leading-relaxed px-2">
          Heed turns the noise into a clear signal — so you decide once,
          confidently.
        </p>
      </div>

      {/* Heed area — fills remaining space */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Image
          src="/brand/heed-mascot.png"
          alt="Heed mascot"
          width={120}
          height={120}
          className="object-contain"
          unoptimized
        />
        <span style={{ fontSize: 12, color: 'rgba(0,166,81,0.7)' }}>
          I&apos;ve got your back.
        </span>
      </div>

      {/* Bottom button */}
      <div style={{ padding: '8px 20px 20px', flexShrink: 0, backgroundColor: '#0A2540' }}>
        <button
          onClick={() => router.push('/onboarding/preview')}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 12,
            backgroundColor: '#00A651',
            color: 'white',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Show me how it works
        </button>
      </div>
    </div>
  );
}

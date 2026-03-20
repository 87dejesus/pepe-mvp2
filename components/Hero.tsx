'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.load();
    v.play().catch(() => {});
  }, []);

  return (
    <section style={{ position: 'relative', width: '100%', height: '100dvh', backgroundColor: '#0A2540' }}>

      {/* ── Video ────────────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src="/brand/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        {...{ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
      />

      {/* ── Dark scrim ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,37,64,0.4)' }} />

      {/* ── Logo — top right ─────────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-20">
        <Image
          src="/brand/steady-one-white.png"
          alt="The Steady One"
          width={110}
          height={38}
          className="object-contain opacity-80"
          priority
        />
      </div>

      {/* ── Overlay text — bottom of video area ─────────────────────────────── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '0 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 512, backgroundColor: 'rgba(10,37,64,0.25)', borderRadius: 16, padding: '28px', marginBottom: 28, textAlign: 'center' }}>
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={72}
            height={72}
            className="object-contain mx-auto mb-4 sm:w-20 sm:h-20"
            priority
          />
          <p className="text-white font-bold text-2xl sm:text-3xl leading-snug mb-3">
            Feeling the pressure of apartment hunting?
          </p>
          <p className="text-white/80 font-semibold text-lg leading-snug mb-1">
            You don&apos;t need more listings.
          </p>
          <p className="text-white/80 font-semibold text-lg leading-snug">
            You need clarity to decide before it&apos;s gone.
          </p>
        </div>

        {/* ── Primary CTA ──────────────────────────────────────────────────────── */}
        <Link
          href="/flow"
          className="flex items-center justify-center w-full max-w-lg bg-[#00A651] hover:bg-[#00913f] text-white font-semibold text-base h-14 rounded-xl active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(0,166,81,0.4)]"
        >
          Find your steady home
        </Link>

        <p className="text-white/60 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/signin" className="text-white font-medium underline underline-offset-2 hover:text-white/80">
            Sign in
          </Link>
        </p>
      </div>

    </section>
  );
}

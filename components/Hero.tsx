'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0A2540]" style={{ minHeight: '92dvh' }}>

      {/* ── Video ────────────────────────────────────────────────────────────── */}
      {/*
        Place your video at /public/brand/hero.mp4
        Scene: woman arrives at apartment door with "Available" sign →
        landlord flips sign to "Rented" → close-up of her disappointed face → fade out.
        Recommended: 8–12s loop, silent (audio stripped), 1080x1920 portrait or 1920x1080.
      */}
      <video
        src="/brand/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ── Dark scrim (always present, softens video) ───────────────────────── */}
      <div className="absolute inset-0 bg-[#0A2540]/50" />

      {/* ── Gradient: transparent top → solid navy bottom ───────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A2540]" />

      {/* ── Logo — top right ─────────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-20">
        <Image
          src="/brand/steady-one-white.png"
          alt="The Steady One"
          width={80}
          height={28}
          className="object-contain opacity-70"
          priority
        />
      </div>

      {/* ── Overlay text — bottom of video area ─────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 flex flex-col items-center">
        <div className="w-full max-w-md bg-[#0A2540]/75 backdrop-blur-sm rounded-2xl px-6 py-5 mb-6 text-center">
          <p className="text-white font-bold text-xl leading-snug mb-2">
            Feeling the pressure of apartment hunting?
          </p>
          <p className="text-white/80 font-semibold text-base leading-snug mb-1">
            You don&apos;t need more listings.
          </p>
          <p className="text-white/80 font-semibold text-base leading-snug">
            You need clarity to decide before it&apos;s gone.
          </p>
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────────── */}
        <Link
          href="/flow"
          className="flex items-center justify-center w-full max-w-md bg-[#00A651] hover:bg-[#00913f] text-white font-semibold text-base h-14 rounded-xl active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(0,166,81,0.4)]"
        >
          Find your steady home
        </Link>

        <p className="text-white/60 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/paywall" className="text-white font-medium underline underline-offset-2 hover:text-white/80">
            Sign in
          </Link>
        </p>
      </div>

    </section>
  );
}

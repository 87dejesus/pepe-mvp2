import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[#0A2540] font-sans">
      <Header />
      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <Image
          src="/brand/heed-mascot.png"
          alt="Heed the crocodile, looking puzzled"
          width={96}
          height={96}
          className="object-contain mb-6 opacity-90"
          priority
        />
        <p className="text-white/50 text-sm tracking-widest uppercase mb-3">
          404
        </p>
        <h1 className="text-white font-bold text-3xl sm:text-4xl leading-snug mb-4 max-w-md">
          This page wandered off.
        </h1>
        <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-md mb-8">
          Heed looked everywhere. Let&apos;s get you back to something steady.
        </p>
        <Link
          href="/"
          className="flex items-center justify-center w-full max-w-xs bg-[#00A651] hover:bg-[#00913f] text-white font-semibold text-base h-12 rounded-xl active:scale-[0.98] transition-all"
        >
          Back to home
        </Link>
        <Link
          href="/flow"
          className="mt-4 text-white/60 text-sm underline underline-offset-2 hover:text-white/90"
        >
          Or start the match quiz
        </Link>
      </section>
    </main>
  );
}

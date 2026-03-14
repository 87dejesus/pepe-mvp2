import Link from 'next/link';
import Header from '@/components/Header';
import Hero from '@/components/Hero';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[#0A2540] font-sans">
      <Header />

      {/* Hero — full-width video with overlay text + CTA */}
      <Hero />

      {/* Value Props */}
      <section className="px-6 py-8 max-w-md mx-auto w-full space-y-3">
        <div className="bg-white/[0.07] border border-white/20 rounded-xl p-4">
          <p className="text-sm font-semibold mb-1 text-white">Know your trade-offs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            Answer 7 quick questions. We match you with listings that fit your non-negotiables.
          </p>
        </div>
        <div className="bg-white/[0.07] border border-white/20 rounded-xl p-4">
          <p className="text-sm font-semibold mb-1 text-white">Decide with confidence</p>
          <p className="text-sm text-white/60 leading-relaxed">
            Each listing gets a match score and an honest take. Act now or wait consciously.
          </p>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="px-6 pb-10">
        <Link
          href="/flow"
          className="flex items-center justify-center w-full max-w-md mx-auto bg-[#00A651] hover:bg-[#00913f] text-white font-semibold text-base h-14 rounded-xl active:scale-[0.98] transition-all"
        >
          Find My Home
        </Link>
      </section>
    </main>
  );
}

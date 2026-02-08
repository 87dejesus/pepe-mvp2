import Link from 'next/link';
import Header from '@/components/Header';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#1E3A8A] via-[#1a3278] to-[#0f1f4d] text-white font-sans">
      <Header />

      {/* Hero — Logo + Slogan */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-6">
        <img
          src="/brand/steady-one-white.png"
          alt="The Steady One"
          className="w-3/4 max-w-sm h-auto drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
        />
        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-center leading-tight">
          Find your steady home in NYC.
        </h1>
        <p className="mt-3 text-sm sm:text-base text-center text-white/70 max-w-sm leading-relaxed">
          NYC rentals move fast. We help you weigh trade-offs in seconds and decide with clarity, not panic.
        </p>
      </section>

      {/* Value Props */}
      <section className="px-6 pb-4 max-w-md mx-auto w-full space-y-3">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
          <p className="text-sm font-bold uppercase tracking-wide mb-1 text-[#00A651]">Know your trade-offs</p>
          <p className="text-sm text-white/70">
            Answer 7 quick questions. We match you with listings that fit your non-negotiables.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
          <p className="text-sm font-bold uppercase tracking-wide mb-1 text-[#00A651]">Decide with confidence</p>
          <p className="text-sm text-white/70">
            Each listing gets a match score and an honest take. Act now or wait consciously.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-8 pt-2">
        <Link
          href="/flow"
          className="block w-full max-w-md mx-auto bg-[#00A651] hover:bg-[#00913f] text-white text-center font-bold text-lg py-4 rounded-xl shadow-lg shadow-black/30 active:scale-[0.98] transition-all border-2 border-[#00A651] hover:border-white/30"
        >
          FIND YOUR HOME
        </Link>
      </section>
    </main>
  );
}

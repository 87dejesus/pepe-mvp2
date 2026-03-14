import Link from 'next/link';
import Header from '@/components/Header';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[#0A2540] font-sans">
      <Header />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <img
          src="/brand/steady-one-white.png"
          alt="The Steady One"
          className="w-3/4 max-w-[220px] h-auto opacity-95"
        />
        <h1 className="mt-7 text-3xl sm:text-4xl font-bold tracking-tight text-center leading-tight text-white">
          Find your steady home in NYC.
        </h1>
        <p className="mt-3 text-sm sm:text-base text-center text-white/60 max-w-sm leading-relaxed">
          NYC rentals move fast. We help you weigh trade-offs in seconds and decide with clarity, not panic.
        </p>
      </section>

      {/* Value Props */}
      <section className="px-6 pb-4 max-w-md mx-auto w-full space-y-3">
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

      {/* CTA */}
      <section className="px-6 pb-10 pt-3">
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

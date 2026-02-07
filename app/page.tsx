import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#1a2e6b] text-white font-sans">

      {/* Hero — Logo + Slogan */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <img
          src="/brand/steady-one-blue.png"
          alt="The Steady One"
          className="w-48 sm:w-56 max-w-xs h-auto drop-shadow-lg"
        />
        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-center leading-tight">
          Find your steady home in NYC.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-center text-white/70 max-w-sm leading-relaxed">
          NYC rentals move fast. We help you weigh trade-offs in seconds and decide with clarity, not panic.
        </p>
      </section>

      {/* Value Props */}
      <section className="px-6 pb-6 max-w-md mx-auto w-full space-y-3">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
          <p className="text-sm font-bold uppercase tracking-wide mb-1 text-white">Know your trade-offs</p>
          <p className="text-sm text-white/70">
            Answer 7 quick questions. We match you with listings that fit your non-negotiables.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
          <p className="text-sm font-bold uppercase tracking-wide mb-1 text-white">Decide with confidence</p>
          <p className="text-sm text-white/70">
            Each listing gets a match score and an honest take. Act now or wait consciously.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-8 pt-2">
        <Link
          href="/flow"
          className="block w-full max-w-md mx-auto bg-[#00A651] hover:bg-[#00913f] text-white text-center font-bold text-lg py-4 rounded-xl shadow-lg shadow-black/20 active:scale-[0.98] transition-all"
        >
          FIND YOUR HOME
        </Link>
      </section>

    </main>
  );
}

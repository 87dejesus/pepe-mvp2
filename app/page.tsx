import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-white text-black font-sans">

      {/* Hero — Logo + Slogan */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <img
          src="/brand/steady-one-blue.png"
          alt="The Steady One"
          className="w-3/4 sm:w-1/2 max-w-md h-auto"
        />
        <p className="mt-6 text-lg sm:text-xl text-center font-bold tracking-tight text-gray-800">
          Find your steady home in NYC.
        </p>
        <p className="mt-2 text-sm sm:text-base text-center text-gray-500 max-w-sm">
          NYC rentals move fast. We help you weigh trade-offs in seconds and decide with clarity, not panic.
        </p>
      </section>

      {/* Value Props */}
      <section className="px-6 pb-8 max-w-md mx-auto w-full space-y-4">
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_black]">
          <p className="text-sm font-bold uppercase tracking-wide mb-1">Know your trade-offs</p>
          <p className="text-sm text-gray-600">
            Answer 7 quick questions. We match you with listings that fit your non-negotiables.
          </p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_black]">
          <p className="text-sm font-bold uppercase tracking-wide mb-1">Decide with confidence</p>
          <p className="text-sm text-gray-600">
            Each listing gets a match score and an honest take. Act now or wait consciously.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-10 pt-2">
        <Link
          href="/flow"
          className="block w-full max-w-md mx-auto bg-[#00A651] border-2 border-black text-white text-center font-bold text-lg py-4 shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
        >
          FIND YOUR HOME
        </Link>
      </section>

    </main>
  );
}

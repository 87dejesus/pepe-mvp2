import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FDFCF8] font-sans">
      <main className="flex flex-1 w-full max-w-3xl mx-auto flex-col items-center justify-center py-12 px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <Image
            src="/logo-v2.png"
            alt="Pepe Logo"
            width={220}
            height={90}
            className="w-[220px] h-auto object-contain"
            priority
            unoptimized
          />
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-zinc-800">
            Stop the NYC Rental Chaos
          </h1>
          <p className="max-w-2xl text-xl leading-8 text-zinc-700">
            NYC rentals don't give you time to think. Pepe helps you objectively weigh the trade-offs of a listing in seconds, so you can decide if you should act now or wait for the next one.
          </p>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            Stop scrolling and start deciding. Pepe aligns your non-negotiables with the reality of the market, so you can move with clarity instead of panic.
          </p>
          <Link
            href="/flow"
            className="flex h-14 items-center justify-center rounded-full bg-emerald-600 px-10 text-lg font-semibold text-white transition-colors hover:bg-emerald-700 mt-4"
          >
            Decide with Confidence
          </Link>
        </div>
      </main>
    </div>
  );
}

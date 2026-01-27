import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full max-w-3xl mx-auto items-center justify-end px-6 py-3 bg-white dark:bg-black">
        <Link
          href="/flow"
          className="rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Feedback
        </Link>
      </header>
      <main className="flex flex-1 w-full max-w-3xl mx-auto flex-col items-center justify-center py-12 px-6 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo-v2.png"
            alt="Pepe Logo"
            width={200}
            height={80}
            className="w-[200px] h-auto object-contain"
            priority
            unoptimized
          />
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-black dark:text-zinc-50">
            Stop the NYC Rental Chaos
          </h1>
          <p className="max-w-2xl text-xl leading-8 text-zinc-700 dark:text-zinc-300">
            The apartment hunt in NYC is brutal. It's exhausting. The endless scrolling, the decision fatigue, the fear of settling for a place you'll regret.
          </p>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Pepe helps you cut through the noise and decide with confidence. No more second-guessing. No more "what if I waited?" No more regret.
          </p>
          <Link
            href="/decision"
            className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 mt-2"
          >
            Decide with Confidence
          </Link>
        </div>
      </main>
    </div>
  );
}

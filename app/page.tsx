import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full max-w-3xl mx-auto items-center justify-between px-6 py-4 bg-white dark:bg-black">
        <Image
          src="/logo-v2.png"
          alt="Pepe Logo"
          width={600}
          height={200}
          className="h-12 w-auto object-contain"
          priority
          unoptimized
        />
        <Link
          href="/flow"
          className="rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Feedback
        </Link>
      </header>
      <main className="flex flex-1 w-full max-w-3xl mx-auto flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="w-full max-w-md">
            <Image
              src="/pepe-ny.jpeg.jpeg"
              alt="Pepe NYC"
              width={600}
              height={500}
              className="w-full h-auto rounded-lg object-cover"
              priority
            />
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-black dark:text-zinc-50">
            withPepe 🏠
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Find your perfect NYC apartment match
          </p>
          <Link
            href="/decision"
            className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}

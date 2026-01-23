import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="w-full max-w-md">
            <img
              src="/pepe-ny.jpeg"
              alt="Pepe NYC"
              className="w-full h-auto rounded-lg object-cover"
              style={{ maxHeight: "500px" }}
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

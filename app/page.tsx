import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-zinc-950">
      {/* Heed wordmark */}
      <div className="mb-10 sm:mb-16">
        <span className="text-6xl font-bold tracking-tight text-zinc-900 sm:text-8xl dark:text-zinc-50">
          Heed
        </span>
      </div>

      {/* Headline + subheadline */}
      <div className="mb-12 flex flex-col items-center gap-5 text-center sm:mb-16">
        <h1 className="max-w-xs text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:max-w-2xl sm:text-6xl dark:text-zinc-50">
          Is this apartment worth committing to?
        </h1>
        <p className="max-w-xs text-lg leading-relaxed text-zinc-500 sm:max-w-lg sm:text-xl dark:text-zinc-400">
          NYC moves fast. Heed helps you decide clearly — before you sign.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-5">
        <Link
          href="/flow"
          className="flex h-14 w-72 items-center justify-center rounded-full bg-zinc-900 text-base font-semibold text-white transition-colors hover:bg-zinc-700 sm:w-80 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Find your steady home
        </Link>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

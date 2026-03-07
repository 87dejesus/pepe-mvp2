import Link from 'next/link';

/**
 * Header — shared across all pages.
 * variant="dark"  → transparent bg, white logo, white text  (dark blue pages)
 * variant="light" → white bg, blue logo, navy text           (off-white pages)
 */
export default function Header({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  if (variant === 'light') {
    return (
      <header className="shrink-0 bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/brand/steady-one-blue.png" alt="The Steady One" className="w-8 h-8 object-contain" />
          <span className="text-[#0A2540] font-semibold text-sm tracking-wide hidden sm:inline">
            THE STEADY ONE
          </span>
        </Link>
      </header>
    );
  }

  return (
    <header className="shrink-0 px-4 py-3 flex items-center">
      <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
        <img src="/brand/steady-one-white.png" alt="The Steady One" className="w-8 h-8 object-contain" />
        <span className="text-white/90 font-semibold text-sm tracking-wide hidden sm:inline">
          THE STEADY ONE
        </span>
      </Link>
    </header>
  );
}

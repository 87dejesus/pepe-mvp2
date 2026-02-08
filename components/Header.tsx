import Link from 'next/link';

export default function Header() {
  return (
    <header className="shrink-0 px-4 py-3 flex items-center">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img
          src="/brand/steady-one-white.png"
          alt="The Steady One"
          className="w-8 h-8 object-contain"
        />
        <span className="text-white font-bold text-sm tracking-wide hidden sm:inline">
          THE STEADY ONE
        </span>
      </Link>
    </header>
  );
}

import Header from '@/components/Header';
import StorageOfferCard from './components/StorageOfferCard';
import { STORAGE_PARTNERS } from './lib/storage-partners';
import Link from 'next/link';

export const metadata = {
  title: 'Storage & Moving Tools — The Steady One',
  description:
    'Storage units, valet storage, security deposit insurance, and lease guarantors — everything you need to actually move.',
};

const STORAGE_PARTNERS_LIST = STORAGE_PARTNERS.filter((p) => p.category === 'storage');
const FINANCIAL_PARTNERS_LIST = STORAGE_PARTNERS.filter((p) => p.category === 'financial');

export default function StoragePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#1E3A8A] to-[#0F2460]">
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <div className="inline-block bg-[#00A651] text-white text-xs font-black uppercase tracking-widest px-3 py-1 border-2 border-black mb-3">
            MOVING TOOLS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
            Everything you need<br />
            <span className="text-[#3B82F6]">to actually move.</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-md">
            Picked for NYC apartment hunters. Storage near you, valet pickup,
            deposit savings, and guarantors — so nothing blocks your move.
          </p>
        </div>

        {/* Storage section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-white font-black uppercase tracking-widest text-xs">
              STORAGE
            </h2>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STORAGE_PARTNERS_LIST.map((partner) => (
              <StorageOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Financial tools section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-white font-black uppercase tracking-widest text-xs">
              MOVE TOOLS
            </h2>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FINANCIAL_PARTNERS_LIST.map((partner) => (
              <StorageOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Disclosure */}
        <div className="bg-white/10 border border-white/20 px-4 py-3 mb-6">
          <p className="text-white/50 text-xs leading-relaxed">
            <span className="font-bold text-white/70">Heads up:</span>{' '}
            Some links above are affiliate links. We may earn a small fee if you
            sign up — at no extra cost to you. We only list partners that are
            genuinely useful for NYC renters.
          </p>
        </div>

        {/* Back nav */}
        <div className="text-center">
          <Link
            href="/decision"
            className="text-xs text-white/50 hover:text-white underline transition-colors"
          >
            ← Back to listings
          </Link>
        </div>

      </main>
    </div>
  );
}

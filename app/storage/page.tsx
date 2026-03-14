import Header from '@/components/Header';
import AdminBypassBanner from '@/components/AdminBypassBanner';
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
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <AdminBypassBanner />
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <span className="inline-block bg-[#F8F6F3] border border-[#E5E5E5] rounded-full text-[#666666] text-xs font-medium px-3 py-1 mb-3">
            Moving Tools
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A2540] leading-tight mb-3">
            Everything you need<br />
            <span className="text-[#00A651]">to actually move.</span>
          </h1>
          <p className="text-[#666666] text-sm sm:text-base leading-relaxed max-w-md">
            Picked for NYC apartment hunters. Storage near you, valet pickup,
            deposit savings, and guarantors — so nothing blocks your move.
          </p>
        </div>

        {/* Storage section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[#0A2540] font-semibold text-xs uppercase tracking-widest">
              Storage
            </h2>
            <div className="flex-1 h-px bg-[#E5E5E5]" />
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
            <h2 className="text-[#0A2540] font-semibold text-xs uppercase tracking-widest">
              Move Tools
            </h2>
            <div className="flex-1 h-px bg-[#E5E5E5]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FINANCIAL_PARTNERS_LIST.map((partner) => (
              <StorageOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Disclosure */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 mb-6">
          <p className="text-[#666666] text-xs leading-relaxed">
            <span className="font-semibold text-[#1A1A1A]">Heads up:</span>{' '}
            Some links above are affiliate links. We may earn a small fee if you
            sign up — at no extra cost to you. We only list partners that are
            genuinely useful for NYC renters.
          </p>
        </div>

        {/* Back nav */}
        <div className="text-center">
          <Link
            href="/decision"
            className="text-xs text-[#666666] hover:text-[#0A2540] underline transition-colors"
          >
            ← Back to listings
          </Link>
        </div>

      </main>
    </div>
  );
}

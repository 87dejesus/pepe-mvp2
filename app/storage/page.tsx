import Header from '@/components/Header';
import AdminBypassBanner from '@/components/AdminBypassBanner';
import StorageOfferCard from './components/StorageOfferCard';
import { STORAGE_PARTNERS } from './lib/storage-partners';
import Link from 'next/link';

export const metadata = {
  title: 'Storage & Moving Tools',
  description:
    'Storage units, valet storage, security deposit insurance, and lease guarantors. Everything you need to actually move.',
};

const SERIF = 'var(--font-caslon), Georgia, serif';

const STORAGE_PARTNERS_LIST = STORAGE_PARTNERS.filter((p) => p.category === 'storage');
const FINANCIAL_PARTNERS_LIST = STORAGE_PARTNERS.filter((p) => p.category === 'financial');

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-white/45 font-bold text-[11px] uppercase tracking-[0.16em]">{children}</h2>
      <div className="flex-1 h-px bg-white/15" />
    </div>
  );
}

export default function StoragePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <AdminBypassBanner />
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A651]">
            Moving tools
          </span>
          <h1 className="text-3xl sm:text-4xl text-white leading-[1.1] mt-3" style={{ fontFamily: SERIF }}>
            Everything you need to actually move.
          </h1>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-md mt-3">
            Picked for NYC hunters. Storage near you, valet pickup, deposit savings, and
            guarantors, so nothing blocks your move.
          </p>
        </div>

        {/* Storage section */}
        <section className="mb-8">
          <SectionLabel>Storage</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STORAGE_PARTNERS_LIST.map((partner) => (
              <StorageOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Financial tools section */}
        <section className="mb-10">
          <SectionLabel>Move tools</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FINANCIAL_PARTNERS_LIST.map((partner) => (
              <StorageOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Disclosure */}
        <div className="bg-white/[0.03] border border-white/15 rounded-xl px-4 py-3 mb-6">
          <p className="text-white/45 text-xs leading-relaxed">
            <span className="font-semibold text-white/70">Heads up:</span>{' '}
            Some links above are affiliate links. We may earn a small fee if you sign up, at no
            extra cost to you. We only list partners genuinely useful for NYC renters.
          </p>
        </div>

        {/* Back nav */}
        <div className="text-center">
          <Link
            href="/decision"
            className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
          >
            ← Back to listings
          </Link>
        </div>

      </main>
    </div>
  );
}

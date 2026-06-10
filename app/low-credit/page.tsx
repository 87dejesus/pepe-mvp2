import Header from '@/components/Header';
import AdminBypassBanner from '@/components/AdminBypassBanner';
import LowCreditOfferCard from './components/LowCreditOfferCard';
import { LOW_CREDIT_PARTNERS } from './lib/low-credit-partners';
import Link from 'next/link';

export const metadata = {
  title: 'Low Credit? Still Get the Apartment',
  description:
    'Lease guarantors, deposit insurance, and zero-deposit programs for NYC renters with low credit, no credit history, or income gaps.',
};

const SERIF = 'var(--font-caslon), Georgia, serif';

export default function LowCreditPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <AdminBypassBanner />
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A651]">
            Credit solutions
          </span>
          <h1 className="text-3xl sm:text-4xl text-white leading-[1.1] mt-3" style={{ fontFamily: SERIF }}>
            Low credit shouldn&apos;t kill your lease.
          </h1>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-md mt-3">
            NYC-trusted tools for renters with low credit, no US credit history, or income gaps.
            Get approved without a co-signer or lump sum deposit.
          </p>
        </div>

        {/* "How it works" callout */}
        <div className="bg-white/[0.04] border border-white/15 rounded-xl px-4 py-4 mb-8">
          <p className="text-white/45 font-bold text-[11px] uppercase tracking-[0.16em] mb-2">
            How it works
          </p>
          <ol className="space-y-1.5 text-white/65 text-sm">
            <li><span className="text-[#00A651] font-semibold">1.</span> Pick the tool that fits your situation below.</li>
            <li><span className="text-[#00A651] font-semibold">2.</span> Apply directly, takes 5 to 10 minutes.</li>
            <li><span className="text-[#00A651] font-semibold">3.</span> Get your approval letter and send it with your application.</li>
          </ol>
        </div>

        {/* Partner cards */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-white/45 font-bold text-[11px] uppercase tracking-[0.16em]">
              Guaranteed options
            </h2>
            <div className="flex-1 h-px bg-white/15" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LOW_CREDIT_PARTNERS.map((partner) => (
              <LowCreditOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Heed's tip — editorial pull-quote */}
        <div className="bg-white/[0.05] border-l-[3px] border-[#00A651] rounded-r-xl pl-4 py-4 pr-4 mb-6">
          <p className="text-[#00A651] font-bold text-[10.5px] uppercase tracking-[0.16em] mb-2">
            Heed&apos;s tip
          </p>
          <p className="text-white/85 text-[15px] leading-relaxed italic" style={{ fontFamily: SERIF }}>
            Apply to a guarantor before you find the apartment. Showing up with an approval letter
            makes landlords take you seriously, even in a competitive market.
          </p>
        </div>

        {/* Disclosure */}
        <div className="bg-white/[0.03] border border-white/15 rounded-xl px-4 py-3 mb-6">
          <p className="text-white/45 text-xs leading-relaxed">
            <span className="font-semibold text-white/70">Heads up:</span>{' '}
            Some links above are affiliate links. We may earn a small fee if you sign up, at no
            extra cost to you. We only list services genuinely useful for NYC renters.
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

import Header from '@/components/Header';
import AdminBypassBanner from '@/components/AdminBypassBanner';
import LowCreditOfferCard from './components/LowCreditOfferCard';
import { LOW_CREDIT_PARTNERS } from './lib/low-credit-partners';
import Link from 'next/link';

export const metadata = {
  title: 'Low Credit? Still Get the Apartment — The Steady One',
  description:
    'Lease guarantors, deposit insurance, and zero-deposit programs for NYC renters with low credit, no credit history, or income gaps.',
};

export default function LowCreditPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3]">
      <AdminBypassBanner />
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <span className="inline-block bg-[#F8F6F3] border border-[#E5E5E5] rounded-full text-[#0A2540] text-xs font-medium px-3 py-1 mb-3">
            Credit Solutions
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A2540] leading-tight mb-3">
            Low credit shouldn&apos;t<br />
            <span className="text-[#00A651]">kill your lease.</span>
          </h1>
          <p className="text-[#666666] text-sm sm:text-base leading-relaxed max-w-md">
            These NYC-trusted tools help renters with low credit, no US credit
            history, or income gaps get approved — without a co-signer or lump
            sum deposit.
          </p>
        </div>

        {/* "How it works" callout */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-4 mb-8">
          <p className="text-[#0A2540] font-semibold text-xs uppercase tracking-widest mb-2">
            How it works
          </p>
          <ol className="space-y-1.5 text-[#666666] text-sm">
            <li><span className="text-[#00A651] font-semibold">1.</span> Pick the tool that fits your situation below.</li>
            <li><span className="text-[#00A651] font-semibold">2.</span> Apply directly — takes 5–10 minutes.</li>
            <li><span className="text-[#00A651] font-semibold">3.</span> Get your approval letter and send it with your application.</li>
          </ol>
        </div>

        {/* Partner cards */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[#0A2540] font-semibold text-xs uppercase tracking-widest">
              Guaranteed Options
            </h2>
            <div className="flex-1 h-px bg-[#E5E5E5]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LOW_CREDIT_PARTNERS.map((partner) => (
              <LowCreditOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Tip box */}
        <div className="bg-[#F8F6F3] border-l-4 border-[#00A651] pl-4 py-4 pr-4 rounded-r-lg mb-6">
          <p className="text-[#0A2540] font-semibold text-xs uppercase tracking-widest mb-1">
            Heed&apos;s Tip
          </p>
          <p className="text-[#666666] text-sm leading-relaxed">
            Apply to a guarantor <span className="text-[#0A2540] font-semibold">before</span> you
            find the apartment. Showing up with an approval letter makes landlords take
            you seriously — even in a competitive market.
          </p>
        </div>

        {/* Disclosure */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 mb-6">
          <p className="text-[#666666] text-xs leading-relaxed">
            <span className="font-semibold text-[#1A1A1A]">Heads up:</span>{' '}
            Some links above are affiliate links. We may earn a small fee if you
            sign up — at no extra cost to you. We only list services that are
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

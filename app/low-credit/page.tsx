import Header from '@/components/Header';
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
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#1E3A8A] to-[#0F2460]">
      <Header />

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <div className="inline-block bg-[#DC2626] text-white text-xs font-black uppercase tracking-widest px-3 py-1 border-2 border-black mb-3">
            CREDIT SOLUTIONS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
            Low credit shouldn't<br />
            <span className="text-[#3B82F6]">kill your lease.</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-md">
            These NYC-trusted tools help renters with low credit, no US credit
            history, or income gaps get approved — without a co-signer or lump
            sum deposit.
          </p>
        </div>

        {/* "How it works" callout */}
        <div className="bg-white/10 border-2 border-white/20 px-4 py-4 mb-8">
          <p className="text-white font-black text-xs uppercase tracking-widest mb-2">
            How it works
          </p>
          <ol className="space-y-1.5 text-white/70 text-sm">
            <li><span className="text-[#00A651] font-bold">1.</span> Pick the tool that fits your situation below.</li>
            <li><span className="text-[#00A651] font-bold">2.</span> Apply directly — takes 5–10 minutes.</li>
            <li><span className="text-[#00A651] font-bold">3.</span> Get your approval letter and send it with your application.</li>
          </ol>
        </div>

        {/* Partner cards */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-white font-black uppercase tracking-widest text-xs">
              GUARANTEED OPTIONS
            </h2>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LOW_CREDIT_PARTNERS.map((partner) => (
              <LowCreditOfferCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>

        {/* Tip box */}
        <div className="bg-[#00A651]/20 border-2 border-[#00A651]/40 px-4 py-4 mb-6">
          <p className="text-white font-black text-xs uppercase tracking-widest mb-1">
            Heed's Tip
          </p>
          <p className="text-white/80 text-sm leading-relaxed">
            Apply to a guarantor <span className="text-white font-bold">before</span> you
            find the apartment. Showing up with an approval letter makes landlords take
            you seriously — even in a competitive market.
          </p>
        </div>

        {/* Disclosure */}
        <div className="bg-white/10 border border-white/20 px-4 py-3 mb-6">
          <p className="text-white/50 text-xs leading-relaxed">
            <span className="font-bold text-white/70">Heads up:</span>{' '}
            Some links above are affiliate links. We may earn a small fee if you
            sign up — at no extra cost to you. We only list services that are
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

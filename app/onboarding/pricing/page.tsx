'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { readAccess, hasAccess } from '@/lib/access';
import { STRIPE_PRICES } from '@/lib/stripe-prices';

const FEATURES = [
  'Match score based on your real constraints',
  'Apply Today vs Wait Thoughtfully — no false urgency',
  'Incentive detection: free months, no-fee deals',
  "Heed's take on every listing",
];

export default function PricingPage() {
  const router = useRouter();

  async function handleCTA() {
    localStorage.setItem('heed_selected_price_id', STRIPE_PRICES.access30days);

    // Guard 1: fast local cache check (no network, within 10-min TTL)
    const access = readAccess();
    if (hasAccess(access)) {
      router.push('/onboarding/post-auth');
      return;
    }

    // Guard 2: server-verified session via getUser()
    // getUser() is required here — getSession() reads from the cookie store
    // synchronously and can return null on the initial call before @supabase/ssr
    // has hydrated cookies from the browser, causing a false "not authenticated"
    // result even for users with a valid session. getUser() makes a server round-trip
    // that correctly refreshes the token and returns the authenticated user.
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/onboarding/post-auth');
        return;
      }
    } catch {
      // Network error — fall through to paywall
    }

    // No authenticated session confirmed — new user needs to authenticate
    router.push('/paywall');
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 overflow-y-auto px-5 max-w-lg mx-auto w-full">
        <OnboardingProgress step={12} />

        {/* Heed speech bubble */}
        <div className="flex items-start gap-3 mb-6">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={40}
            height={40}
            className="object-contain shrink-0 mt-0.5"
          />
          <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-sm font-semibold text-[#0A2540] leading-snug">
              One decision. One payment.
            </p>
            <p className="text-[11px] text-[#0A2540]/50 mt-0.5">
              No rush. No panic. Just clarity when you need it most.
            </p>
          </div>
        </div>

        {/* Plan card */}
        <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-5 mb-5">
          {/* Price row */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">$9.49</span>
            <span className="text-white/50 text-sm">· 30-day access</span>
          </div>
          <p className="text-white/40 text-xs mb-5">
            No auto-renewal. No surprise charges.
          </p>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                <span className="text-[#00A651] font-bold mt-0.5 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pb-4" />
      </div>

      <div className="px-5 pb-6 pt-3 max-w-lg mx-auto w-full">
        <button
          onClick={handleCTA}
          className="w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] transition-all mb-2"
        >
          Start free — then $9.49
        </button>
        <p className="text-white/30 text-xs text-center leading-relaxed">
          3 days free, then $9.49 for 30-day access. No auto-renewal.
        </p>
      </div>
    </div>
  );
}

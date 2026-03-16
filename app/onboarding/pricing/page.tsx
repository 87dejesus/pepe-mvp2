'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { readAccess, hasAccess } from '@/lib/access';

// ── Plan definitions ────────────────────────────────────────────────────────

type PlanKey = 'weekly' | 'annual';

const PLANS: Record<
  PlanKey,
  {
    priceId: string;
    label: string;
    price: string;
    period: string;
    weeklyEquiv: string | null;
    description: string;
    badge: string | null;
  }
> = {
  weekly: {
    priceId: 'price_1T635F08QwenlVoWj7gLcF8j',
    label: 'Weekly',
    price: '$4.49',
    period: '/week',
    weeklyEquiv: null,
    description: 'Perfect for right now — decide fast, but thoughtfully.',
    badge: null,
  },
  annual: {
    priceId: 'price_1TAVgd08QwenlVoWKqgaX44W',
    label: 'Annual',
    price: '$49.99',
    period: '/year',
    weeklyEquiv: '≈ $0.96/week',
    description:
      "Heed stays with you all year, ready for any future move without last-minute panic. Save ~79%.",
    badge: 'Best value – No rush, more peace',
  },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanKey>('annual');

  async function handleCTA() {
    const plan = PLANS[selected];
    localStorage.setItem('heed_selected_price_id', plan.priceId);

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
              Start your free trial
            </p>
            <p className="text-[11px] text-[#0A2540]/50 mt-0.5">
              No rush. No panic. Just clarity when you need it most.
            </p>
          </div>
        </div>

        {/* Trial callout banner */}
        <div className="bg-[#00A651]/[0.12] border border-[#00A651]/30 rounded-xl px-4 py-3 mb-5 text-center">
          <p className="text-[#00A651] font-semibold text-sm">
            3-day free trial — no charge today
          </p>
        </div>

        {/* Plan cards — stacked on mobile, side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {(Object.entries(PLANS) as [PlanKey, (typeof PLANS)[PlanKey]][]).map(
            ([key, plan]) => (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`relative flex-1 rounded-2xl border p-5 text-left transition-all ${
                  selected === key
                    ? 'border-[#00A651]/60 bg-[#00A651]/[0.10]'
                    : 'border-white/20 bg-white/[0.05] hover:bg-white/[0.08]'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#00A651] text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Radio indicator */}
                <div
                  className={`w-4 h-4 rounded-full border-2 mb-3 flex items-center justify-center transition-all ${
                    selected === key
                      ? 'border-[#00A651] bg-[#00A651]'
                      : 'border-white/30'
                  }`}
                >
                  {selected === key && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${
                    selected === key ? 'text-[#00A651]' : 'text-white/40'
                  }`}
                >
                  {plan.label}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-2xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-white/50 text-sm">{plan.period}</span>
                </div>
                {plan.weeklyEquiv && (
                  <p className="text-white/40 text-xs mb-2">{plan.weeklyEquiv}</p>
                )}

                {/* Description */}
                <p className="text-white/55 text-xs leading-relaxed mt-1">
                  {plan.description}
                </p>
              </button>
            )
          )}
        </div>

        <div className="pb-4" />
      </div>

      <div className="px-5 pb-6 pt-3 max-w-lg mx-auto w-full">
        <button
          onClick={handleCTA}
          className="w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] transition-all mb-2"
        >
          {`Start free trial — ${PLANS[selected].label}`}
        </button>
        <p className="text-white/30 text-xs text-center leading-relaxed">
          No credit card required today. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

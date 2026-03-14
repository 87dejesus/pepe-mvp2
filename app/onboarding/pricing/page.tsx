'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';
import { OnboardingProgress } from '@/components/OnboardingProgress';

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

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // hides UI until admin check completes

  // Admin bypass: if already authenticated as admin, skip payment entirely
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = createSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email === 'luhciano.sj@gmail.com') {
          router.replace('/decision');
          return;
        }
      } catch {}
      setReady(true);
    }
    checkAdmin();
  }, [router]);

  async function handleCTA() {
    setLoading(true);
    setError(null);
    const plan = PLANS[selected];

    try {
      const supabase = createSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated yet — store choice then send to /paywall
        localStorage.setItem('heed_selected_price_id', plan.priceId);
        router.push('/paywall');
        return;
      }

      // Already authenticated — go straight to Stripe Checkout
      const res = await fetch('/api/stripe/create-checkout-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setError(msg);
      setLoading(false);
    }
  }

  // Spinner while admin check runs (avoids flash of pricing for admin user)
  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A2540]">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 flex flex-col px-5 pb-8 max-w-lg mx-auto w-full">
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

        {/* CTA */}
        <button
          onClick={handleCTA}
          disabled={loading}
          className="w-full h-14 rounded-xl bg-[#00A651] text-white font-semibold text-base hover:bg-[#00913f] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none transition-all mb-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Preparing checkout…
            </span>
          ) : (
            `Start free trial — ${PLANS[selected].label}`
          )}
        </button>

        {error && (
          <p className="text-red-400 text-xs text-center mb-3 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <p className="text-white/30 text-xs text-center leading-relaxed">
          No credit card required today. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

'use client';

/**
 * /onboarding/post-auth
 *
 * Intermediate page visited immediately after successful OTP verification.
 * Navigated to via window.location.href (hard navigation) so session cookies
 * are guaranteed to be present when this page makes API calls.
 *
 * Routing logic:
 *   1. heed_selected_price_id in localStorage → call Stripe checkout-v2 → Stripe
 *   2. new_user                               → start-trial → /decision
 *   3. trialing / active                      → /decision
 *   4. canceled (grace period)                → /decision
 *   5. canceled (expired) / none              → /subscribe?reason=...
 *   6. payment_failed                         → /subscribe?reason=payment_failed
 */

import { useEffect, useState } from 'react';
import { cacheServerAccess } from '@/lib/access';

type AccessStatus = 'new_user' | 'trialing' | 'active' | 'canceled' | 'payment_failed' | 'none';

type AccessData = {
  status: AccessStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export default function PostAuthPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function route() {
      try {
        // ── 1. Onboarding Stripe path ─────────────────────────────────────
        const priceId = localStorage.getItem('heed_selected_price_id');
        if (priceId) {
          console.log('[post-auth] priceId found — calling Stripe:', priceId);
          // Do NOT remove yet — keep in localStorage until redirect succeeds
          const res = await fetch('/api/stripe/create-checkout-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
          });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
          localStorage.removeItem('heed_selected_price_id');
          window.location.href = data.url;
          return;
        }

        // ── 2. Access-status routing ──────────────────────────────────────
        const accessRes = await fetch('/api/auth/access-status');
        if (!accessRes.ok) throw new Error(`access-status ${accessRes.status}`);
        const accessData: AccessData = await accessRes.json();
        console.log('[post-auth] access-status:', accessData.status);

        if (accessData.status === 'new_user') {
          const trialRes = await fetch('/api/auth/start-trial', { method: 'POST' });
          if (trialRes.ok) {
            const trialData = await trialRes.json() as { status: string; trial_ends_at: string };
            cacheServerAccess({ status: 'trialing', trial_ends_at: trialData.trial_ends_at });
            window.location.href = '/decision';
          } else if (trialRes.status === 409) {
            const retryData = await trialRes.json() as AccessData;
            cacheServerAccess(retryData);
            window.location.href = '/decision';
          } else {
            throw new Error(`start-trial ${trialRes.status}`);
          }
          return;
        }

        if (accessData.status === 'trialing' || accessData.status === 'active') {
          cacheServerAccess(accessData);
          window.location.href = '/decision';
          return;
        }

        if (accessData.status === 'canceled') {
          const grace = accessData.current_period_end ? new Date(accessData.current_period_end) : null;
          if (grace && grace > new Date()) {
            cacheServerAccess(accessData);
            window.location.href = '/decision';
          } else {
            window.location.href = '/subscribe?reason=canceled';
          }
          return;
        }

        if (accessData.status === 'payment_failed') {
          window.location.href = '/subscribe?reason=payment_failed';
          return;
        }

        // 'none' or unknown
        window.location.href = '/subscribe?reason=trial_ended';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[post-auth] routing error:', msg);
        setError(msg);
      }
    }

    route();
  }, []);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0A2540] px-6 text-center">
        <p className="text-white font-semibold mb-2">Something went wrong</p>
        <p className="text-white/60 text-sm mb-6">{error}</p>
        <button
          onClick={() => window.location.href = '/paywall'}
          className="h-12 px-6 rounded-xl bg-[#00A651] text-white font-semibold text-sm hover:bg-[#00913f] transition-all"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A2540]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm">Setting up your account…</p>
      </div>
    </div>
  );
}

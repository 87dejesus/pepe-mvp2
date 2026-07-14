'use client';

/**
 * /onboarding/post-auth
 *
 * Intermediate page visited immediately after successful OTP verification.
 * Navigated to via window.location.href (hard navigation) so session cookies
 * are guaranteed to be present when this page makes API calls.
 *
 * Routing logic (access-status is ALWAYS called first):
 *   trialing / active           → /decision  (priceId ignored and cleared)
 *   canceled (grace period)     → /decision  (priceId ignored and cleared)
 *   new_user + priceId          → Stripe checkout  (intentional path from /onboarding/pricing)
 *   new_user + no priceId       → start-trial → /decision
 *   canceled (expired) + priceId→ Stripe checkout  (resubscribe path)
 *   canceled (expired)/none     → /subscribe?reason=canceled|trial_ended
 *   payment_failed              → /subscribe?reason=payment_failed
 *
 * heed_selected_price_id is only consumed when the user actually needs to
 * subscribe. It is silently cleared for users who already have access so a
 * stale key from a previous pricing-page visit can never hijack the flow.
 */

import { useEffect, useState } from 'react';
import { cacheServerAccess } from '@/lib/access';
import { STRIPE_PRICES } from '@/lib/stripe-prices';
import { trackFunnel } from '@/lib/funnel';

type AccessStatus = 'new_user' | 'trialing' | 'active' | 'canceled' | 'payment_failed' | 'none';

type AccessData = {
  status: AccessStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

async function goToStripeCheckout(priceId: string): Promise<void> {
  console.log('[post-auth] calling Stripe checkout for priceId:', priceId);
  const res = await fetch('/api/stripe/create-checkout-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  console.log('[post-auth] Stripe checkout response:', res.status, data);
  if (!res.ok || !data.url) throw new Error(data.error ?? `Checkout failed (${res.status})`);
  localStorage.removeItem('heed_selected_price_id');
  // Funnel: leaving for Stripe checkout. keepalive carries the beacon through the redirect.
  trackFunnel('checkout_start');
  console.log('[post-auth] → redirecting to Stripe');
  window.location.href = data.url;
}

export default function PostAuthPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Checking your account…');

  useEffect(() => {
    async function route() {
      console.log('[post-auth] ── route() started ──');
      try {
        // ── 1. Always check access-status first ───────────────────────────
        // This is the authoritative gate. heed_selected_price_id is only used
        // when the server confirms the user has no active access.
        console.log('[post-auth] calling /api/auth/access-status...');
        const accessRes = await fetch('/api/auth/access-status');
        console.log('[post-auth] access-status HTTP status:', accessRes.status);
        if (!accessRes.ok) {
          const errBody = await accessRes.text().catch(() => '');
          throw new Error(`access-status ${accessRes.status}: ${errBody}`);
        }
        const accessData: AccessData = await accessRes.json();
        console.log('[post-auth] access-status response:', JSON.stringify(accessData));

        // ── 2. User already has access → /decision, stale priceId cleared ─
        if (accessData.status === 'trialing' || accessData.status === 'active') {
          localStorage.removeItem('heed_selected_price_id');
          cacheServerAccess({ ...accessData, status: accessData.status as Exclude<AccessStatus, 'new_user'> });
          console.log('[post-auth] → /decision (status:', accessData.status + ')');
          // Funnel: OTP round-trip complete, user is being granted access. Under the
          // free model every authenticated non-admin lands here — this is the real
          // conversion endpoint that replaces the dead Stripe 'paid' event.
          trackFunnel('access_granted');
          setMessage('Welcome back — restoring your access…');
          window.location.href = '/decision';
          return;
        }

        if (accessData.status === 'canceled') {
          const grace = accessData.current_period_end ? new Date(accessData.current_period_end) : null;
          const inGrace = grace !== null && grace > new Date();
          console.log('[post-auth] canceled — grace end:', accessData.current_period_end, '| in grace:', inGrace);
          if (inGrace) {
            localStorage.removeItem('heed_selected_price_id');
            cacheServerAccess({ ...accessData, status: accessData.status as Exclude<AccessStatus, 'new_user'> });
            console.log('[post-auth] → /decision (canceled, in grace period)');
            setMessage('Welcome back — restoring your access…');
            window.location.href = '/decision';
          } else {
            // Expired cancel — let them resubscribe via Stripe if they picked a plan
            const priceId = localStorage.getItem('heed_selected_price_id');
            console.log('[post-auth] canceled+expired — priceId:', priceId ?? '(none)');
            if (priceId) {
              setMessage('Redirecting to checkout…');
              await goToStripeCheckout(priceId);
            } else {
              console.log('[post-auth] → /subscribe?reason=canceled');
              window.location.href = '/subscribe?reason=canceled';
            }
          }
          return;
        }

        if (accessData.status === 'payment_failed') {
          localStorage.removeItem('heed_selected_price_id');
          console.log('[post-auth] → /subscribe?reason=payment_failed');
          window.location.href = '/subscribe?reason=payment_failed';
          return;
        }

        // ── 3. new_user → checkout (NO trial) ──────────────────────────────
        // The free read in onboarding is the try-before-buy. New users pay the
        // one-time $9.49 directly; we never start a free trial anymore.
        if (accessData.status === 'new_user') {
          const priceId = localStorage.getItem('heed_selected_price_id') || STRIPE_PRICES.access30days;
          console.log('[post-auth] new_user — checkout priceId:', priceId);
          setMessage('Redirecting to checkout…');
          await goToStripeCheckout(priceId);
          return;
        }

        // ── 4. 'none' or unknown ───────────────────────────────────────────
        const priceId = localStorage.getItem('heed_selected_price_id');
        console.log('[post-auth] status=none — priceId:', priceId ?? '(none)');
        if (priceId) {
          setMessage('Redirecting to checkout…');
          await goToStripeCheckout(priceId);
        } else {
          console.log('[post-auth] → /paywall (status:', accessData.status + ', no priceId)');
          window.location.href = '/paywall';
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[post-auth] !! routing error:', msg);
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
        <p className="text-white/60 text-sm">{message}</p>
      </div>
    </div>
  );
}

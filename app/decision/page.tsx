/**
 * /decision — Server Component
 *
 * Admin bypass is handled FIRST, server-side, before any auth/DB/Stripe code.
 * ?admin=heed → immediately renders DecisionClient with subscriptionStatus='active'.
 * No redirect to /paywall is possible in this path.
 *
 * For normal users:
 * 1. Reads subscription status from DB (if a session exists) and passes it down.
 * 2. If coming from Stripe checkout (?session_id=...), waits briefly for the
 *    webhook to write to DB before the DB read.
 * Access gating (redirect to /paywall) is done client-side in DecisionClient.
 */

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import DecisionClient from './DecisionClient';

type UserRow = {
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export default async function DecisionPage({
  searchParams,
}: {
  searchParams: Promise<{
    admin?: string;
    checkout_success?: string;
    session_id?: string;
  }>;
}) {
  const params = await searchParams;

  // ── Admin bypass — MUST be checked first, before any auth/DB code ──────────
  // ?admin=heed grants full access unconditionally. No session required.
  if (params.admin === 'heed') {
    return (
      <Suspense>
        <DecisionClient subscriptionStatus="active" trialEndsAt={null} />
      </Suspense>
    );
  }

  // ── Normal path ─────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If coming from Stripe checkout, validate session and wait for webhook
  const fromCheckout = params.checkout_success === '1';
  const sessionId = params.session_id;

  if (fromCheckout && sessionId && user) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey?.startsWith('sk_')) {
      try {
        const stripe = new Stripe(stripeKey, {
          apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
        });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const checkoutOk =
          session.payment_status === 'paid' ||
          session.status === 'complete' ||
          (session.mode === 'subscription' && !!session.subscription);

        if (checkoutOk) {
          // Webhook may still be in flight — give it up to 3s to write to DB
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error('[Decision] Stripe session retrieve error:', err);
      }
    }
  }

  // Subscription check — only if authenticated. No user → 'none', client handles redirect.
  let subscriptionStatus = 'none';
  let trialEndsAt: string | null = null;

  if (user) {
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_status, trial_ends_at, current_period_end')
      .eq('id', user.id)
      .single<UserRow>();

    subscriptionStatus = userRow?.subscription_status ?? 'none';
    trialEndsAt = userRow?.trial_ends_at ?? null;
  }

  return (
    <Suspense>
      <DecisionClient
        subscriptionStatus={subscriptionStatus}
        trialEndsAt={trialEndsAt}
      />
    </Suspense>
  );
}

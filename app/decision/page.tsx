/**
 * /decision — Server Component
 *
 * ?admin=heed is checked FIRST — before cookies(), auth, DB, or Stripe.
 * It short-circuits and renders DecisionClient with forceFullAccess=true.
 * forceFullAccess is a synchronous prop: no effects, no race conditions,
 * no redirect to /paywall is possible.
 *
 * Normal users: auth → DB subscription check → pass status to client.
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

  // ── Admin bypass ────────────────────────────────────────────────────────────
  // Checked before ANY async work. forceFullAccess=true is a synchronous prop —
  // DecisionClient never redirects when it receives this.
  if (params.admin === 'heed') {
    return (
      <Suspense>
        <DecisionClient forceFullAccess={true} />
      </Suspense>
    );
  }

  // ── Normal path ─────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If coming from Stripe checkout, wait briefly for the webhook to write to DB
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
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error('[Decision] Stripe session retrieve error:', err);
      }
    }
  }

  // Subscription check — no user → 'none', client handles redirect to paywall
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

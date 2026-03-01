/**
 * /decision — Server Component
 *
 * Auth and subscription are enforced here, server-side:
 * 1. Middleware already blocks unauthenticated users (redirects to /paywall).
 * 2. This page double-checks and also verifies subscription status in DB.
 * 3. If coming from checkout (?session_id=...), validates with Stripe and
 *    waits briefly for the webhook to write to the DB before checking.
 *
 * On success, passes subscriptionStatus + trialEndsAt as props to DecisionClient.
 */

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import DecisionClient from './DecisionClient';

type UserRow = {
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

function hasActiveAccess(row: UserRow | null): boolean {
  if (!row) return false;
  if (row.subscription_status === 'active') return true;
  if (row.subscription_status === 'trialing' && row.trial_ends_at) {
    return new Date(row.trial_ends_at) > new Date();
  }
  return false;
}

export default async function DecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_success?: string; session_id?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // 1. Auth check — middleware handles this but we double-check here
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/paywall?reason=auth');
  }

  // 2. If coming from Stripe checkout, validate session server-side
  const params = await searchParams;
  const fromCheckout = params.checkout_success === '1';
  const sessionId = params.session_id;

  if (fromCheckout && sessionId) {
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
        // Non-fatal — fall through to DB check
      }
    }
  }

  // 3. Subscription check from DB
  const { data: userRow } = await supabase
    .from('users')
    .select('subscription_status, trial_ends_at, current_period_end')
    .eq('id', user.id)
    .single<UserRow>();

  // 4. Dev mock: steady_dev_mock cookie allows bypass (set by paywall dev buttons)
  // localStorage is not accessible server-side, so we read from cookie instead.
  // The paywall DevMockButton now also sets a cookie for this to work.
  const devMock = cookieStore.get('steady_dev_mock')?.value;
  const isDevMock = devMock === 'trialing' || devMock === 'active';

  if (!hasActiveAccess(userRow) && !isDevMock) {
    redirect('/paywall?reason=subscription');
  }

  const subscriptionStatus = isDevMock
    ? (devMock as string)
    : (userRow?.subscription_status ?? 'none');

  const trialEndsAt = userRow?.trial_ends_at ?? null;

  return (
    <Suspense>
      <DecisionClient
        subscriptionStatus={subscriptionStatus}
        trialEndsAt={trialEndsAt}
      />
    </Suspense>
  );
}

/**
 * GET /api/stripe/check-session?session_id=cs_xxx
 *
 * Directly verifies a Stripe Checkout Session and, if complete, writes the
 * subscription state to the users table — bypassing webhook timing entirely.
 *
 * Used by /subscribe as a fast-path after checkout return, before falling
 * back to the access-status polling loop that depends on the webhook.
 *
 * Security:
 *   - Session ID is validated to belong to the authenticated user via metadata.
 *   - Only sessions in 'complete' status with an active/trialing subscription
 *     result in a DB write.
 *
 * Returns:
 *   200 { status: 'trialing' | 'active', trial_ends_at, current_period_end }
 *   200 { status: 'pending' } — session not yet complete or no subscription
 *   400 — missing/invalid session_id
 *   401 — not authenticated
 *   403 — session belongs to a different user
 *   500 — Stripe or DB error
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import {
  createSupabaseServerRouteClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

// Stripe fields that moved in newer API versions — cast via this shape to avoid TS errors
type SubData = {
  id: string;
  status: string;
  customer: string | { id: string };
  trial_end: number | null;
  current_period_end: number;
};

export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_')) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? '';
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Missing or invalid session_id' }, { status: 400 });
  }

  // Authenticate
  const cookieStore = await cookies();
  const supabase = createSupabaseServerRouteClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn('[check-session] Not authenticated — authError:', authError?.message ?? 'none');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST';
  console.log(`[check-session] sessionId: ${sessionId} | user: ${user.id} | stripe mode: ${stripeMode}`);

  try {
    const stripe = getStripe();

    // Retrieve session — subscription is returned as an ID, fetch separately
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(
      `[check-session] session status: ${session.status} | payment_status: ${session.payment_status} | meta userId: ${session.metadata?.supabase_user_id ?? 'none'}`
    );

    // Security: confirm this session was created for the authenticated user
    if (session.metadata?.supabase_user_id !== user.id) {
      console.warn(
        `[check-session] User mismatch — auth: ${user.id} | session meta: ${session.metadata?.supabase_user_id ?? 'none'}`
      );
      return NextResponse.json(
        { error: 'Session does not belong to this user' },
        { status: 403 }
      );
    }

    // Session not yet finalised on Stripe's side
    if (session.status !== 'complete') {
      console.log(`[check-session] Session not complete yet (status: ${session.status})`);
      return NextResponse.json({ status: 'pending' });
    }

    // Get subscription ID
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id: string } | null)?.id ?? null;

    if (!subscriptionId) {
      console.log('[check-session] Session complete but no subscription ID');
      return NextResponse.json({ status: 'pending' });
    }

    // Fetch subscription details — cast via SubData to avoid API-version type drift
    const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as SubData;
    const stripeSubStatus = sub.status; // 'trialing' | 'active' | 'incomplete' | ...
    console.log(`[check-session] subscription ${subscriptionId} status: ${stripeSubStatus}`);

    const ourStatus: 'trialing' | 'active' | null =
      stripeSubStatus === 'trialing' ? 'trialing'
      : stripeSubStatus === 'active' ? 'active'
      : null;

    if (!ourStatus) {
      // Subscription exists but not in a grantable state yet (e.g. 'incomplete')
      console.log(`[check-session] Subscription not grantable yet (stripe status: ${stripeSubStatus})`);
      return NextResponse.json({ status: 'pending' });
    }

    const trialEndsAt = sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null;
    const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : (sub.customer as { id: string }).id;

    // Write to DB — same upsert as the webhook would perform
    const db = createSupabaseServiceClient();
    const { error: upsertError } = await db.from('users').upsert(
      {
        id: user.id,
        email: session.customer_email ?? user.email ?? '',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: ourStatus,
        trial_ends_at: trialEndsAt,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      console.error('[check-session] DB upsert error:', upsertError.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(
      `[check-session] User ${user.id} → ${ourStatus} (webhook bypass, session: ${sessionId})`
    );
    return NextResponse.json({ status: ourStatus, trial_ends_at: trialEndsAt, current_period_end: currentPeriodEnd });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[check-session] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

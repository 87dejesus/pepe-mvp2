/**
 * GET /api/stripe/check-session?session_id=cs_xxx
 *
 * Directly verifies a Stripe Checkout Session and, if complete, writes the
 * subscription state to the users table — bypassing webhook timing entirely.
 *
 * Auth is OPTIONAL — user identity is derived from session.metadata.supabase_user_id
 * (set at checkout creation time). The session_id is cryptographically unguessable.
 *
 * Returns:
 *   200 { status: 'trialing' | 'active', trial_ends_at, current_period_end }
 *   200 { status: 'pending' } — session not yet complete or subscription not grantable
 *   400 — missing/invalid session_id
 *   401 — cannot determine user (no metadata + not authenticated)
 *   403 — authenticated user doesn't match session metadata
 *   500 — Stripe or DB error
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import {
  createSupabaseServerRouteClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

// Stripe fields that may vary across API versions — cast via this shape.
// current_period_end was moved to items in newer Stripe API versions.
// Timestamp fields may be Unix epoch numbers OR ISO 8601 strings depending on API version.
type SubData = {
  id: string;
  status: string;
  customer: string | { id: string };
  trial_end?: number | string | null;
  current_period_end?: number | string;
  items?: { data?: Array<{ current_period_end?: number | string }> };
};

export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_')) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion });
}

/**
 * Safely converts a Stripe timestamp to ISO string.
 *
 * Stripe traditionally returns Unix epoch numbers, but newer API versions
 * (2024-09-30+) may return ISO 8601 strings. Both are handled here so that
 * neither format can throw "Invalid time value".
 *
 * Returns null for missing, zero, or unparseable values — never throws.
 */
function safeTimestamp(val: unknown, field: string): string | null {
  if (val === null || val === undefined || val === 0 || val === '') return null;

  if (typeof val === 'number') {
    if (!isFinite(val) || val <= 0) {
      console.warn(`[check-session] safeTimestamp(${field}): non-finite number ${val}, skipping`);
      return null;
    }
    return new Date(val * 1000).toISOString();
  }

  if (typeof val === 'string') {
    // Try ISO parse directly (new API format)
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        console.warn(`[check-session] safeTimestamp(${field}): string "${val}" not a valid date, skipping`);
        return null;
      }
      return d.toISOString();
    } catch {
      console.warn(`[check-session] safeTimestamp(${field}): failed to parse "${val}", skipping`);
      return null;
    }
  }

  console.warn(`[check-session] safeTimestamp(${field}): unexpected type ${typeof val} (${JSON.stringify(val)}), skipping`);
  return null;
}

/**
 * Reads current_period_end from top-level or items.
 * Handles both Stripe API formats (number or ISO string) and both schema locations.
 */
function getPeriodEnd(sub: SubData): string | null {
  const fromTop = sub.current_period_end;
  const fromItems = sub.items?.data?.[0]?.current_period_end;

  if (fromTop !== undefined && fromTop !== null && fromTop !== 0) {
    console.log(`[check-session] period_end source: top-level, raw value: ${fromTop}`);
    return safeTimestamp(fromTop, 'current_period_end');
  }

  if (fromItems !== undefined && fromItems !== null && fromItems !== 0) {
    console.log(`[check-session] period_end source: items[0], raw value: ${fromItems}`);
    return safeTimestamp(fromItems, 'current_period_end');
  }

  console.log('[check-session] no valid current_period_end found in top-level or items, continuing with null');
  return null;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? '';
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Missing or invalid session_id' }, { status: 400 });
  }

  // Auth is optional — fall back to session metadata when cookies aren't present
  // (auth cookies frequently don't survive the cross-domain Stripe redirect).
  const cookieStore = await cookies();
  const supabase = createSupabaseServerRouteClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST';
  console.log(
    `[check-session] invoked | sessionId: ${sessionId} | auth user: ${user?.id ?? '(none)'} | mode: ${stripeMode}`
  );

  try {
    const stripe = getStripe();

    console.log(`[check-session] retrieving session from Stripe: ${sessionId}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(
      `[check-session] session found | status: ${session.status} | payment_status: ${session.payment_status} | meta.supabase_user_id: ${session.metadata?.supabase_user_id ?? '(none)'}`
    );

    // Prefer user ID from Stripe metadata — independent of auth cookie survival
    const metadataUserId = session.metadata?.supabase_user_id ?? null;

    // If both are present, they must agree
    if (user && metadataUserId && user.id !== metadataUserId) {
      console.warn(
        `[check-session] ownership mismatch — auth user: ${user.id} | session metadata: ${metadataUserId}`
      );
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 });
    }

    const userId = metadataUserId ?? user?.id ?? null;
    if (!userId) {
      console.warn('[check-session] cannot determine user — no metadata and not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.status !== 'complete') {
      console.log(`[check-session] session not complete (status: ${session.status}), returning pending`);
      return NextResponse.json({ status: 'pending' });
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id: string } | null)?.id ?? null;

    if (!subscriptionId) {
      console.log('[check-session] session complete but subscription id missing, returning pending');
      return NextResponse.json({ status: 'pending' });
    }

    console.log(`[check-session] retrieving subscription: ${subscriptionId}`);
    const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as SubData;
    const stripeSubStatus = sub.status;
    console.log(`[check-session] subscription status: ${stripeSubStatus} | trial_end raw: ${sub.trial_end ?? '(none)'}`);

    const ourStatus: 'trialing' | 'active' | null =
      stripeSubStatus === 'trialing' ? 'trialing'
      : stripeSubStatus === 'active' ? 'active'
      : null;

    if (!ourStatus) {
      console.log(`[check-session] subscription not grantable (stripe status: ${stripeSubStatus}), returning pending`);
      return NextResponse.json({ status: 'pending' });
    }

    // Safe timestamp conversion — never throws for any value Stripe may return
    const trialEndsAt = safeTimestamp(sub.trial_end, 'trial_end');
    const currentPeriodEnd = getPeriodEnd(sub);
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : (sub.customer as { id: string }).id;

    console.log(
      `[check-session] writing DB | userId: ${userId} | status: ${ourStatus} | trial_ends_at: ${trialEndsAt ?? 'null'} | current_period_end: ${currentPeriodEnd ?? 'null'}`
    );

    const db = createSupabaseServiceClient();
    const { error: upsertError } = await db.from('users').upsert(
      {
        id: userId,
        email: session.customer_email ?? user?.email ?? '',
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
      console.error('[check-session] DB upsert failed:', upsertError.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(
      `[check-session] access granted | userId: ${userId} | persisted status: ${ourStatus} | session: ${sessionId}`
    );
    return NextResponse.json({
      status: ourStatus,
      trial_ends_at: trialEndsAt,
      current_period_end: currentPeriodEnd,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[check-session] unhandled error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

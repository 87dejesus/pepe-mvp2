/**
 * POST /api/stripe/create-portal-session
 *
 * Creates a Stripe Billing Portal session so payment_failed users can update
 * their payment method on their existing subscription without starting a new one.
 *
 * Identity is derived from the authenticated Supabase session cookie — never
 * from the request body.
 *
 * Requirements enforced server-side:
 *   - Valid Supabase session (cookie)
 *   - users.subscription_status must be 'payment_failed'
 *   - users.stripe_customer_id must be present (no fallback to checkout)
 *
 * Returns { url } — client redirects to Stripe-hosted billing portal.
 * On return from portal, Stripe redirects to /subscribe?portal_return=1.
 *
 * Error codes (returned in JSON alongside HTTP status):
 *   not_authenticated  — 401: no valid session cookie
 *   user_not_found     — 404: authenticated but no row in users table
 *   wrong_status       — 403: subscription_status is not payment_failed
 *   no_stripe_customer — 422: stripe_customer_id missing — contact support
 *   db_error           — 500: Supabase query failed
 *   stripe_error       — 500: Stripe API call failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { createSupabaseServerRouteClient, createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    console.error('[Portal] STRIPE_SECRET_KEY missing or invalid');
    return NextResponse.json(
      { error: 'Stripe is not configured.', code: 'stripe_error' },
      { status: 500 }
    );
  }

  // ── Authenticate via session cookie ─────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createSupabaseServerRouteClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated.', code: 'not_authenticated' },
      { status: 401 }
    );
  }

  // ── Read billing state from users table ─────────────────────────────────────
  const db = createSupabaseServiceClient();
  const { data: userRow, error: dbError } = await db
    .from('users')
    .select('subscription_status, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle();

  if (dbError) {
    console.error('[Portal] DB error:', dbError.message);
    return NextResponse.json(
      { error: 'Database error.', code: 'db_error' },
      { status: 500 }
    );
  }

  if (!userRow) {
    console.warn(`[Portal] No users row for ${user.id}`);
    return NextResponse.json(
      { error: 'User record not found.', code: 'user_not_found' },
      { status: 404 }
    );
  }

  // ── Validate status — only payment_failed users may use this route ───────────
  if (userRow.subscription_status !== 'payment_failed') {
    console.warn(
      `[Portal] User ${user.id} requested portal with status '${userRow.subscription_status}' — rejected`
    );
    return NextResponse.json(
      {
        error: 'Billing portal is only available for accounts with a failed payment.',
        code: 'wrong_status',
      },
      { status: 403 }
    );
  }

  // ── Require stripe_customer_id — no fallback to checkout ────────────────────
  if (!userRow.stripe_customer_id) {
    console.error(
      `[Portal] User ${user.id} has payment_failed but stripe_customer_id is missing — possible webhook gap`
    );
    return NextResponse.json(
      {
        error: 'No billing account found. Please contact support.',
        code: 'no_stripe_customer',
      },
      { status: 422 }
    );
  }

  console.log(
    `[Portal] Creating session for user ${user.id} | customer: ${userRow.stripe_customer_id} | subscription: ${userRow.stripe_subscription_id ?? 'not recorded'}`
  );

  // ── Create billing portal session ───────────────────────────────────────────
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
  });

  const origin = req.headers.get('origin') ?? 'https://www.thesteadyone.com';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: userRow.stripe_customer_id,
      // After updating payment method, Stripe retries open invoices automatically.
      // /subscribe?portal_return=1 polls for the resulting webhook update.
      return_url: `${origin}/subscribe?portal_return=1`,
    });

    console.log(`[Portal] Session created: ${session.id}`);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Portal] Stripe error:', message);

    // Detect Stripe Customer Portal not configured in Dashboard.
    // Raw Stripe message is not shown to users — replace with actionable copy.
    const isConfigError =
      message.toLowerCase().includes('configuration') ||
      message.toLowerCase().includes('no portal') ||
      message.toLowerCase().includes('portal has not been');
    const userMessage = isConfigError
      ? 'The billing portal is not available right now. Please contact support.'
      : 'Unable to open billing portal. Please try again or contact support.';

    return NextResponse.json({ error: userMessage, code: 'stripe_error' }, { status: 500 });
  }
}

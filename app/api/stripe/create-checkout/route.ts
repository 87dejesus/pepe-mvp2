/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for the $2.49/week plan with 3-day free trial.
 * Identity is derived from the authenticated Supabase session cookie — never trusted from client body.
 * Passes supabase_user_id in metadata so the webhook can link the subscription.
 *
 * Returns { url } — client redirects to that URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { createSupabaseServerRouteClient, createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    console.error('[Stripe] STRIPE_SECRET_KEY missing or invalid');
    return NextResponse.json(
      { error: 'Stripe is not configured.' },
      { status: 500 }
    );
  }
  if (!process.env.STRIPE_PRICE_ID?.startsWith('price_')) {
    console.error('[Stripe] STRIPE_PRICE_ID missing or invalid');
    return NextResponse.json(
      { error: 'Stripe price not configured.' },
      { status: 500 }
    );
  }

  // Log Stripe environment to confirm test vs live mode in Vercel logs
  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST';
  console.log(`[Stripe] create-checkout — mode: ${stripeMode} | priceId: ${process.env.STRIPE_PRICE_ID ?? '(not set)'}`);

  // Derive identity from authenticated session — never trust client body
  const cookieStore = await cookies();
  const supabase = createSupabaseServerRouteClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const userId = user.id;
  const email = user.email;

  // reason is non-sensitive UI metadata used only for the cancel_url — not for identity
  const body = await req.json().catch(() => ({}));
  const cancelReason = typeof body.reason === 'string' && body.reason ? `?reason=${body.reason}` : '';

  // ── Trial eligibility check ──────────────────────────────────────────────────
  // Rule: grant a Stripe trial (trial_period_days: 3) ONLY if the user has never
  // consumed the server-side OTP trial. The OTP trial sets trial_ends_at in the
  // users table via /api/auth/start-trial. Any non-null trial_ends_at means the
  // user already had their free trial — no second trial via Stripe.
  //
  // This covers all cases:
  //   - No row in users table      → trial_ends_at is null → Stripe trial granted
  //   - Row with trial_ends_at null → trial never used      → Stripe trial granted
  //   - Row with trial_ends_at set  → OTP trial consumed    → NO Stripe trial
  const db = createSupabaseServiceClient();
  const { data: userRow, error: dbError } = await db
    .from('users')
    .select('trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  if (dbError) {
    console.error('[Stripe] Failed to check trial eligibility:', dbError.message);
    return NextResponse.json({ error: 'Could not verify trial eligibility.' }, { status: 500 });
  }

  const trialAlreadyUsed = !!userRow?.trial_ends_at;
  const stripeTrial = trialAlreadyUsed ? undefined : { trial_period_days: 3 };

  console.log(
    `[Stripe] User ${userId} — trial_ends_at: ${userRow?.trial_ends_at ?? 'null'} → Stripe trial: ${trialAlreadyUsed ? 'SKIPPED' : 'GRANTED'}`
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
  });

  const origin = req.headers.get('origin') ?? 'https://www.thesteadyone.com';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        ...stripeTrial,
        metadata: {
          supabase_user_id: userId,
        },
      },
      // Pass userId in session metadata too (for checkout.session.completed event)
      metadata: {
        supabase_user_id: userId,
      },
      // Returns to /subscribe for post-checkout verification (polling for webhook)
      success_url: `${origin}/subscribe?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe${cancelReason}`,
    });

    console.log(`[Stripe] Checkout session created: ${session.id} for user ${userId}`);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe] Checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

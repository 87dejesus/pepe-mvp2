/**
 * POST /api/stripe/create-checkout-v2
 *
 * Like create-checkout but the caller specifies which price ID to use.
 * Used from /onboarding/pricing for weekly vs annual plan selection.
 *
 * Identity is derived from the authenticated Supabase session cookie only.
 * Price IDs are validated against an allow-list — never trust raw client input.
 *
 * Returns { url } — client redirects to that URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import {
  createSupabaseServerRouteClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Hard-coded allow-list — no arbitrary price IDs from the client
const ALLOWED_PRICE_IDS = new Set([
  'price_1T635F08QwenlVoWj7gLcF8j', // Weekly $4.49/week
  'price_1TAVgd08QwenlVoWKqgaX44W', // Annual $49.99/year
]);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    console.error('[Stripe v2] STRIPE_SECRET_KEY missing or invalid');
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  // Authenticate via session cookie — never trust client for identity
  const cookieStore = await cookies();
  const supabase = createSupabaseServerRouteClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // Validate price ID against allow-list
  const body = await req.json().catch(() => ({})) as { priceId?: unknown };
  const priceId = typeof body.priceId === 'string' ? body.priceId : null;

  if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: 'Invalid price ID.' }, { status: 400 });
  }

  // Trial eligibility — same rule as create-checkout:
  // grant Stripe trial only if the user has never consumed the OTP/server trial.
  const db = createSupabaseServiceClient();
  const { data: userRow, error: dbError } = await db
    .from('users')
    .select('trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  if (dbError) {
    console.error('[Stripe v2] Failed to check trial eligibility:', dbError.message);
    return NextResponse.json({ error: 'Could not verify trial eligibility.' }, { status: 500 });
  }

  const trialAlreadyUsed = !!userRow?.trial_ends_at;
  const stripeTrial = trialAlreadyUsed ? undefined : { trial_period_days: 3 };

  console.log(
    `[Stripe v2] User ${user.id} | priceId: ${priceId} | trial: ${
      trialAlreadyUsed ? 'SKIPPED (already used)' : 'GRANTED'
    }`
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
  });

  const origin = req.headers.get('origin') ?? 'https://www.thesteadyone.com';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...stripeTrial,
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
      locale: 'en',
      success_url: `${origin}/subscribe?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/onboarding/pricing`,
    });

    console.log(`[Stripe v2] Session created: ${session.id} for user ${user.id}`);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe v2] Checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

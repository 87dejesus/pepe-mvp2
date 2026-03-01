/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for the $2.49/week plan with 3-day free trial.
 * Expects { email, userId } in the request body (set after Supabase OTP auth).
 * Passes supabase_user_id in metadata so the webhook can link the subscription.
 *
 * Returns { url } — client redirects to that URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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

  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? '').trim().toLowerCase();
  const userId = (body.userId ?? '').trim();

  if (!email || !userId) {
    return NextResponse.json(
      { error: 'Email e userId são obrigatórios.' },
      { status: 400 }
    );
  }

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
        trial_period_days: 3,
        metadata: {
          supabase_user_id: userId,
        },
      },
      // Pass userId in session metadata too (for checkout.session.completed event)
      metadata: {
        supabase_user_id: userId,
      },
      success_url: `${origin}/decision?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paywall`,
    });

    console.log(`[Stripe] Checkout session created: ${session.id} for user ${userId}`);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe] Checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for the $2.49/week plan with 3-day free trial.
 * Returns { url } — client redirects to that URL.
 *
 * Uses STRIPE_SECRET_KEY and STRIPE_PRICE_ID from .env.local (test mode keys).
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export async function POST(req: NextRequest) {
  // Validate env vars are present
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    console.error('[Steady Debug] STRIPE_SECRET_KEY missing or invalid in .env.local');
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local.' },
      { status: 500 }
    );
  }
  if (!process.env.STRIPE_PRICE_ID?.startsWith('price_')) {
    console.error('[Steady Debug] STRIPE_PRICE_ID missing or invalid in .env.local');
    return NextResponse.json(
      { error: 'Stripe price not configured. Add STRIPE_PRICE_ID to .env.local.' },
      { status: 500 }
    );
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
      },
      // After success: land on /decision with ?checkout_success=1
      // DecisionClient detects this param and activates the local trial state.
      success_url: `${origin}/decision?checkout_success=1`,
      cancel_url: `${origin}/paywall`,
    });

    console.log(`[Steady Debug] Checkout session created: ${session.id}`);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Steady Debug] Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

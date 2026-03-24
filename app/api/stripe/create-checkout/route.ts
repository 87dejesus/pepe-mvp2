/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for the $4.49/week plan with 3-day free trial.
 * Identity is derived from the authenticated Supabase session cookie — never trusted from client body.
 * Passes supabase_user_id in metadata so the webhook can link the subscription.
 *
 * Returns { url } — client redirects to that URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { createSupabaseServerRouteClient } from '@/lib/supabase-server';

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

  console.log(`[Stripe] User ${userId} — creating payment checkout`);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion,
  });

  const origin = req.headers.get('origin') ?? 'https://www.thesteadyone.com';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
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

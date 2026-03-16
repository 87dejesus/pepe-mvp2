/**
 * Stripe Webhook Handler — The Steady One
 * Route: POST /api/stripe/webhook
 *
 * Handles: checkout.session.completed, customer.subscription.updated,
 *          customer.subscription.deleted, invoice.payment_failed
 *
 * ─── Test Mode Setup ──────────────────────────────────────────────────────────
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Login: stripe login
 * 3. Forward events to local server:
 *      stripe listen --forward-to localhost:3000/api/stripe/webhook
 *    This prints a webhook signing secret: whsec_test_...
 *    Copy it to STRIPE_WEBHOOK_SECRET in .env.local
 * 4. In a second terminal, trigger test events:
 *      stripe trigger checkout.session.completed
 *      stripe trigger customer.subscription.deleted
 *      stripe trigger invoice.payment_failed
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Required env vars (test mode values from dashboard.stripe.com):
 *   STRIPE_SECRET_KEY       = sk_test_51...
 *   STRIPE_WEBHOOK_SECRET   = whsec_... (from `stripe listen` output)
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_51...
 *   NEXT_PUBLIC_STRIPE_PRICE_ID        = price_... (weekly $2.49 test price)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role — bypasses RLS
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[Steady Debug] Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Steady Debug] Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('[Steady Debug] checkout.session.completed missing userId in metadata');
          break;
        }

        // Fetch full subscription to get trial_end + current_period_end
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const status = stripeSub.status; // 'trialing' (3-day trial) or 'active'
        const trialEnd = stripeSub.trial_end
          ? new Date(stripeSub.trial_end * 1000).toISOString()
          : null;
        const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status,
          trialEndsAt: trialEnd,
          currentPeriodEnd: periodEnd,
        });

        console.log(`[Steady Debug] Subscription created for user ${userId} — status: ${status}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) {
          console.warn('[Steady Debug] subscription.updated: no userId in metadata, skipping');
          break;
        }

        const status = sub.status;
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        await upsertSubscription({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status,
          trialEndsAt: trialEnd,
          currentPeriodEnd: periodEnd,
        });

        console.log(`[Steady Debug] Subscription updated for user ${userId} — status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) {
          console.warn('[Steady Debug] subscription.deleted: no userId in metadata, skipping');
          break;
        }

        // Keep the row — mark as canceled.
        // Access continues until current_period_end (user paid for that week already).
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        await upsertSubscription({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: 'canceled',
          trialEndsAt: null,
          currentPeriodEnd: periodEnd,
        });

        console.log(`[Steady Debug] Subscription canceled for user ${userId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('[Steady Debug] Failed to set past_due:', error);
        } else {
          console.log(`[Steady Debug] Subscription ${subscriptionId} set to past_due`);
        }
        break;
      }

      default:
        console.log(`[Steady Debug] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[Steady Debug] Error processing webhook:', err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function upsertSubscription(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: params.userId,
        stripe_customer_id: params.stripeCustomerId,
        stripe_subscription_id: params.stripeSubscriptionId,
        status: params.status,
        trial_ends_at: params.trialEndsAt,
        current_period_end: params.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Steady Debug] upsertSubscription error:', error);
    throw error;
  }
}

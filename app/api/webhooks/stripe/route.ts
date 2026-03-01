/**
 * POST /api/webhooks/stripe
 *
 * Receives and processes Stripe webhook events.
 * Verifies the signature with STRIPE_WEBHOOK_SECRET.
 * Updates public.users table via Supabase service role (bypasses RLS).
 *
 * Events handled:
 *   checkout.session.completed     → trialing (trial starts)
 *   customer.subscription.updated  → sync subscription status
 *   customer.subscription.deleted  → canceled
 *   invoice.payment_succeeded      → active (trial converted or renewal)
 *   invoice.payment_failed         → payment_failed
 *
 * Setup: add this URL in Stripe Dashboard > Webhooks:
 *   https://www.thesteadyone.com/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Stripe requires the raw body to verify the signature
export const config = {
  api: { bodyParser: false },
};

// Stripe v20 API type helpers — some fields changed shape in newer API versions
type SubData = {
  id: string;
  status: Stripe.Subscription['status'];
  customer: string | Stripe.Customer | Stripe.DeletedCustomer;
  trial_end: number | null;
  current_period_end: number;
};
type InvoiceData = {
  customer: string | Stripe.Customer | Stripe.DeletedCustomer;
  subscription: string | Stripe.Subscription | null;
};

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_')) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-02-25.clover' as Stripe.LatestApiVersion });
}

// Maps Stripe subscription.status → our internal status
function mapStripeStatus(
  stripeStatus: Stripe.Subscription['status']
): string {
  switch (stripeStatus) {
    case 'trialing':    return 'trialing';
    case 'active':      return 'active';
    case 'canceled':    return 'canceled';
    case 'past_due':    return 'payment_failed';
    case 'unpaid':      return 'payment_failed';
    case 'incomplete':  return 'payment_failed';
    default:            return 'none';
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Read raw body for signature verification
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  console.log(`[Webhook] Event: ${event.type} | id: ${event.id}`);

  try {
    const db = createSupabaseServiceClient();

    switch (event.type) {
      // ── Trial starts immediately after checkout ────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (!userId) {
          console.warn('[Webhook] checkout.session.completed: no supabase_user_id in metadata');
          break;
        }

        // Fetch the subscription to get trial_end
        let trialEndsAt: string | null = null;
        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const stripe = getStripe();
          const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as SubData;
          trialEndsAt = sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null;
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }

        const { error } = await db.from('users').upsert(
          {
            id: userId,
            email: session.customer_email ?? '',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: trialEndsAt ? 'trialing' : 'active',
            trial_ends_at: trialEndsAt,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (error) console.error('[Webhook] checkout upsert error:', error.message);
        else console.log(`[Webhook] User ${userId} → trialing (checkout complete)`);
        break;
      }

      // ── Subscription status changes (upgrade, trial→active, cancellation) ─
      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as SubData;
        const customerId = sub.customer as string;
        const status = mapStripeStatus(sub.status);
        const trialEndsAt = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
        const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();

        const { error } = await db
          .from('users')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: status,
            trial_ends_at: trialEndsAt,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('[Webhook] subscription.updated error:', error.message);
        else console.log(`[Webhook] Customer ${customerId} → ${status}`);
        break;
      }

      // ── Subscription canceled (user or admin) ─────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as SubData;
        const customerId = sub.customer as string;

        const { error } = await db
          .from('users')
          .update({
            subscription_status: 'canceled',
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('[Webhook] subscription.deleted error:', error.message);
        else console.log(`[Webhook] Customer ${customerId} → canceled`);
        break;
      }

      // ── Payment succeeded (trial converted, or renewal) ───────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as InvoiceData;
        const customerId = invoice.customer as string;
        // Only update on subscription invoices (not one-off)
        if (!invoice.subscription) break;

        const stripe = getStripe();
        const subscriptionRef = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as { id: string }).id;
        const sub = (await stripe.subscriptions.retrieve(subscriptionRef)) as unknown as SubData;
        const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();

        const { error } = await db
          .from('users')
          .update({
            subscription_status: 'active',
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('[Webhook] payment_succeeded error:', error.message);
        else console.log(`[Webhook] Customer ${customerId} → active (payment succeeded)`);
        break;
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as InvoiceData;
        const customerId = invoice.customer as string;

        const { error } = await db
          .from('users')
          .update({
            subscription_status: 'payment_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('[Webhook] payment_failed error:', error.message);
        else console.log(`[Webhook] Customer ${customerId} → payment_failed`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook] Handler error:', msg);
    // Return 200 anyway — Stripe will retry if we return 4xx/5xx
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}

/**
 * POST /api/webhooks/stripe
 *
 * Receives and processes Stripe webhook events.
 * Verifies the signature with STRIPE_WEBHOOK_SECRET.
 * Updates public.users table via Supabase service role (bypasses RLS).
 *
 * Events handled:
 *   checkout.session.completed     → trialing or active (from sub.status)
 *   customer.subscription.updated  → sync subscription status
 *   customer.subscription.deleted  → canceled
 *   invoice.payment_succeeded      → active (trial converted or renewal)
 *   invoice.payment_failed         → payment_failed
 *
 * Webhook URL (Stripe Dashboard → Live mode → Developers → Webhooks):
 *   https://www.thesteadyone.com/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Stripe v20 type helpers.
// Timestamp fields may be Unix epoch numbers OR ISO 8601 strings depending on API version.
// current_period_end was moved to items in newer Stripe API versions.
type SubData = {
  id: string;
  status: Stripe.Subscription['status'];
  customer: string | Stripe.Customer | Stripe.DeletedCustomer;
  trial_end?: number | string | null;
  current_period_end?: number | string;
  items?: { data?: Array<{ current_period_end?: number | string }> };
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
      console.warn(`[Webhook] safeTimestamp(${field}): non-finite number ${val}, skipping`);
      return null;
    }
    return new Date(val * 1000).toISOString();
  }

  if (typeof val === 'string') {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        console.warn(`[Webhook] safeTimestamp(${field}): string "${val}" not a valid date, skipping`);
        return null;
      }
      return d.toISOString();
    } catch {
      console.warn(`[Webhook] safeTimestamp(${field}): failed to parse "${val}", skipping`);
      return null;
    }
  }

  console.warn(`[Webhook] safeTimestamp(${field}): unexpected type ${typeof val} (${JSON.stringify(val)}), skipping`);
  return null;
}

/**
 * Reads current_period_end from top-level or items.
 * Handles both Stripe API formats (number or ISO string) and both schema locations.
 */
function getPeriodEnd(sub: SubData, context: string): string | null {
  const fromTop = sub.current_period_end;
  const fromItems = sub.items?.data?.[0]?.current_period_end;

  if (fromTop !== undefined && fromTop !== null && fromTop !== 0) {
    console.log(`[Webhook:${context}] period_end source: top-level, raw: ${fromTop}`);
    return safeTimestamp(fromTop, 'current_period_end');
  }

  if (fromItems !== undefined && fromItems !== null && fromItems !== 0) {
    console.log(`[Webhook:${context}] period_end source: items[0], raw: ${fromItems}`);
    return safeTimestamp(fromItems, 'current_period_end');
  }

  console.log(`[Webhook:${context}] no valid current_period_end found, continuing with null`);
  return null;
}

// Maps Stripe subscription.status → our internal status
function mapStripeStatus(stripeStatus: Stripe.Subscription['status']): string {
  switch (stripeStatus) {
    case 'trialing':   return 'trialing';
    case 'active':     return 'active';
    case 'canceled':   return 'canceled';
    case 'past_due':   return 'payment_failed';
    case 'unpaid':     return 'payment_failed';
    case 'incomplete': return 'payment_failed';
    default:           return 'none';
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const secretHint = webhookSecret.slice(0, 12) + '…';
  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST';

  console.log(
    `[Webhook] incoming POST | mode: ${stripeMode} | sig present: ${!!sig} | secret hint: ${secretHint} | bytes: ${body.length}`
  );

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      `[Webhook] signature verification FAILED | mode: ${stripeMode} | hint: ${secretHint} | error: ${msg}`
    );
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  console.log(`[Webhook] event received: ${event.type} | id: ${event.id}`);

  try {
    const db = createSupabaseServiceClient();

    switch (event.type) {

      // ── Checkout completed — subscription just created ─────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (!userId) {
          console.warn('[Webhook:checkout.completed] no supabase_user_id in session metadata, skipping');
          break;
        }

        console.log(
          `[Webhook:checkout.completed] userId: ${userId} | customerId: ${customerId ?? '(none)'} | subscriptionId: ${subscriptionId ?? '(none)'}`
        );

        let ourStatus = 'active';
        let trialEndsAt: string | null = null;
        let currentPeriodEnd: string | null = null;

        if (subscriptionId) {
          const stripe = getStripe();
          const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as SubData;
          console.log(`[Webhook:checkout.completed] subscription status from Stripe: ${sub.status} | trial_end raw: ${sub.trial_end ?? '(none)'}`);

          // Use sub.status directly — more reliable than trial_end heuristic
          ourStatus = mapStripeStatus(sub.status);
          trialEndsAt = safeTimestamp(sub.trial_end, 'trial_end');
          currentPeriodEnd = getPeriodEnd(sub, 'checkout.completed');
        } else {
          // one-time payment — grant 30 days from now
          currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        console.log(
          `[Webhook:checkout.completed] persisting | userId: ${userId} | status: ${ourStatus} | trial_ends_at: ${trialEndsAt ?? 'null'} | active_until: ${currentPeriodEnd ?? 'null'}`
        );

        const { error } = await db.from('users').upsert(
          {
            id: userId,
            email: session.customer_email ?? '',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: ourStatus,
            trial_ends_at: trialEndsAt,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (error) {
          console.error(`[Webhook:checkout.completed] DB upsert failed: ${error.message}`);
        } else {
          console.log(`[Webhook:checkout.completed] DB updated — userId: ${userId} → status: ${ourStatus}`);
        }
        break;
      }

      // ── Subscription status changes ────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as SubData;
        const customerId = typeof sub.customer === 'string'
          ? sub.customer
          : (sub.customer as Stripe.Customer).id;
        const status = mapStripeStatus(sub.status);
        const trialEndsAt = safeTimestamp(sub.trial_end, 'trial_end');
        const currentPeriodEnd = getPeriodEnd(sub, 'subscription.updated');

        console.log(
          `[Webhook:subscription.updated] customerId: ${customerId} | stripe status: ${sub.status} → our status: ${status} | active_until: ${currentPeriodEnd ?? 'null'}`
        );

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

        if (error) {
          console.error(`[Webhook:subscription.updated] DB update failed: ${error.message}`);
        } else {
          console.log(`[Webhook:subscription.updated] DB updated — customerId: ${customerId} → ${status}`);
        }
        break;
      }

      // ── Subscription canceled ──────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as SubData;
        const customerId = typeof sub.customer === 'string'
          ? sub.customer
          : (sub.customer as Stripe.Customer).id;
        const currentPeriodEnd = getPeriodEnd(sub, 'subscription.deleted');

        console.log(`[Webhook:subscription.deleted] customerId: ${customerId} | active_until: ${currentPeriodEnd ?? 'null'}`);

        const { error } = await db
          .from('users')
          .update({
            subscription_status: 'canceled',
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error(`[Webhook:subscription.deleted] DB update failed: ${error.message}`);
        } else {
          console.log(`[Webhook:subscription.deleted] DB updated — customerId: ${customerId} → canceled`);
        }
        break;
      }

      // ── Payment succeeded (trial→active or renewal) ────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as InvoiceData;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as Stripe.Customer).id;

        if (!invoice.subscription) {
          console.log('[Webhook:payment_succeeded] no subscription on invoice, skipping');
          break;
        }

        const subscriptionRef = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as { id: string }).id;

        console.log(`[Webhook:payment_succeeded] customerId: ${customerId} | subscriptionId: ${subscriptionRef}`);

        const stripe = getStripe();
        const sub = (await stripe.subscriptions.retrieve(subscriptionRef)) as unknown as SubData;
        const currentPeriodEnd = getPeriodEnd(sub, 'payment_succeeded');

        console.log(
          `[Webhook:payment_succeeded] persisting | customerId: ${customerId} | status: active | active_until: ${currentPeriodEnd ?? 'null'}`
        );

        const { error } = await db
          .from('users')
          .update({
            subscription_status: 'active',
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error(`[Webhook:payment_succeeded] DB update failed: ${error.message}`);
        } else {
          console.log(`[Webhook:payment_succeeded] DB updated — customerId: ${customerId} → active`);
        }
        break;
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as InvoiceData;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as Stripe.Customer).id;

        console.log(`[Webhook:payment_failed] customerId: ${customerId}`);

        const { error } = await db
          .from('users')
          .update({
            subscription_status: 'payment_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error(`[Webhook:payment_failed] DB update failed: ${error.message}`);
        } else {
          console.log(`[Webhook:payment_failed] DB updated — customerId: ${customerId} → payment_failed`);
        }
        break;
      }

      default:
        console.log(`[Webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Webhook] handler error for event ${event.type}: ${msg}`);
    // Always return 200 — Stripe retries on 4xx/5xx
  }

  return NextResponse.json({ received: true });
}

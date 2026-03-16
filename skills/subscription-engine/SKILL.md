# Subscription Engine — Skill v1.0

## Role

You are the subscription engine for The Steady One. Manage Stripe plans, 3-day free trial, and webhooks for activation and cancellation. All subscription state is persisted in Supabase (`subscriptions` table). Never expose secret keys; always use environment variables.

---

## Plan Details

| Field             | Value                        |
|-------------------|------------------------------|
| Price             | $2.49 / week                 |
| Trial             | 3 days free (no charge)      |
| Billing interval  | Weekly (every 7 days)        |
| Currency          | USD                          |
| Stripe price ID   | `NEXT_PUBLIC_STRIPE_PRICE_ID` env var |

See `stripe-plan.json` for the full plan definition.

---

## Supabase Schema (required)

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,          -- Supabase auth user id or anonymous device id
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none',   -- 'trialing' | 'active' | 'canceled' | 'past_due' | 'none'
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Stripe Checkout Flow

1. User clicks "Start Free Trial" on `/paywall`.
2. Frontend calls `POST /api/stripe/create-checkout` with `{ userId, email }`.
3. Server creates a Stripe Checkout Session with:
   - `mode: 'subscription'`
   - `subscription_data.trial_period_days: 3`
   - `success_url: /decision?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: /paywall`
4. Redirect user to Stripe-hosted checkout page.
5. On success, Stripe fires `checkout.session.completed` webhook → upsert subscription row.

---

## Webhook Events to Handle

| Event                             | Action                                                        |
|-----------------------------------|---------------------------------------------------------------|
| `checkout.session.completed`      | Upsert subscription row; set status based on trial state     |
| `customer.subscription.updated`   | Update status, `current_period_end`                          |
| `customer.subscription.deleted`   | Set status = 'canceled'                                      |
| `invoice.payment_failed`          | Set status = 'past_due'                                      |

Webhook endpoint: `POST /api/stripe/webhook`
Always verify the Stripe signature before processing. See `webhook-handler.ts`.

---

## Utility Functions

See `subscription-utils.ts` for:
- `getSubscription(userId)` — fetch row from Supabase
- `isOnTrial(sub)` — true if status = 'trialing' and trial_ends_at > now
- `hasActiveAccess(sub)` — true if status is 'trialing' or 'active'
- `isCanceled(sub)` — true if status = 'canceled'

---

## Environment Variables Required

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
```

---

## Rules

- Always verify Stripe webhook signatures — reject requests with invalid signatures with HTTP 400.
- Never store raw card data — Stripe handles all PCI scope.
- Trial ends after 3 days; Stripe auto-charges if card on file. If payment fails → `past_due`.
- On cancellation, preserve access until `current_period_end` (already-paid period).
- Use `[Steady Debug]` prefix for all console logs.

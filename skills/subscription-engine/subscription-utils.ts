/**
 * Subscription Utilities — The Steady One
 *
 * Helper functions to check subscription state for a given userId.
 * All reads go through Supabase. Use these in middleware and page components.
 */

import { createClient } from '@supabase/supabase-js';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'none';

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

// Use the anon key for client-side reads; service role for server-side writes.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Fetch the subscription row for a user. Returns null if not found.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    console.error('[Steady Debug] getSubscription error:', error);
    return null;
  }

  return data as Subscription;
}

/**
 * True if the user is currently in a free trial (trial_ends_at is in the future).
 */
export function isOnTrial(sub: Subscription | null): boolean {
  if (!sub || sub.status !== 'trialing') return false;
  if (!sub.trial_ends_at) return false;
  return new Date(sub.trial_ends_at) > new Date();
}

/**
 * True if the user has full access — either on trial or on an active paid subscription.
 * Also returns true if subscription is canceled but current_period_end is still in the future
 * (grace period: user already paid for that week).
 */
export function hasActiveAccess(sub: Subscription | null): boolean {
  if (!sub) return false;

  if (sub.status === 'trialing' && isOnTrial(sub)) return true;
  if (sub.status === 'active') return true;

  // Canceled but still within paid period
  if (sub.status === 'canceled' && sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }

  return false;
}

/**
 * True if the subscription is canceled AND the paid period has expired.
 * Use this to show a "resubscribe" prompt.
 */
export function isCanceled(sub: Subscription | null): boolean {
  if (!sub || sub.status !== 'canceled') return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end) <= new Date();
}

/**
 * True if payment failed and the subscription is past due.
 */
export function isPastDue(sub: Subscription | null): boolean {
  return sub?.status === 'past_due';
}

/**
 * Returns a human-readable label for the subscription status.
 */
export function getStatusLabel(sub: Subscription | null): string {
  if (!sub || sub.status === 'none') return 'No subscription';
  if (isOnTrial(sub)) {
    const end = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
    const daysLeft = end
      ? Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    return `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
  }
  if (sub.status === 'active') return 'Active — $2.49/week';
  if (isCanceled(sub)) return 'Canceled';
  if (isPastDue(sub)) return 'Payment failed';
  return sub.status;
}

/**
 * Returns how many days remain in the trial, or 0 if not on trial.
 */
export function trialDaysRemaining(sub: Subscription | null): number {
  if (!isOnTrial(sub) || !sub?.trial_ends_at) return 0;
  const ms = new Date(sub.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

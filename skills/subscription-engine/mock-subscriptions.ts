/**
 * Mock Subscriptions — Dev / Testing Only
 *
 * Provides preset Subscription objects for each access scenario.
 * Use these to test the paywall, trial banner, and blocked state
 * WITHOUT making a real Stripe payment.
 *
 * How to activate in the browser console:
 *   import { setDevMock } from '@/skills/subscription-engine/mock-subscriptions';
 *   setDevMock('trialing');   // 2 days left on trial
 *   setDevMock('active');     // paid subscriber
 *   setDevMock('canceled');   // canceled, grace period expired
 *   setDevMock('past_due');   // payment failed
 *   setDevMock('none');       // no subscription (preview mode)
 *   clearDevMock();           // remove override, use real Supabase
 *
 * Or directly in browser console (no import needed):
 *   localStorage.setItem('steady_dev_mock', 'trialing');
 *   location.reload();
 */

import type { Subscription } from './subscription-utils';

export const DEV_MOCK_KEY = 'steady_dev_mock';

export type MockScenario = 'trialing' | 'active' | 'canceled' | 'past_due' | 'none';

const now = new Date();
const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_SUBSCRIPTIONS: Record<MockScenario, Subscription | null> = {
  // On trial — 2 days remaining
  trialing: {
    id: 'mock-trial-id',
    user_id: 'mock-user',
    stripe_customer_id: 'cus_mock_trial',
    stripe_subscription_id: 'sub_mock_trial',
    status: 'trialing',
    trial_ends_at: inTwoDays,
    current_period_end: inSevenDays,
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },

  // Active paid subscription — within current weekly period
  active: {
    id: 'mock-active-id',
    user_id: 'mock-user',
    stripe_customer_id: 'cus_mock_active',
    stripe_subscription_id: 'sub_mock_active',
    status: 'active',
    trial_ends_at: null,
    current_period_end: inSevenDays,
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },

  // Canceled — grace period already expired (hard block)
  canceled: {
    id: 'mock-canceled-id',
    user_id: 'mock-user',
    stripe_customer_id: 'cus_mock_canceled',
    stripe_subscription_id: 'sub_mock_canceled',
    status: 'canceled',
    trial_ends_at: null,
    current_period_end: oneDayAgo, // period ended yesterday
    created_at: twoDaysAgo,
    updated_at: oneDayAgo,
  },

  // Payment failed — past due
  past_due: {
    id: 'mock-pastdue-id',
    user_id: 'mock-user',
    stripe_customer_id: 'cus_mock_pastdue',
    stripe_subscription_id: 'sub_mock_pastdue',
    status: 'past_due',
    trial_ends_at: null,
    current_period_end: oneDayAgo,
    created_at: twoDaysAgo,
    updated_at: oneDayAgo,
  },

  // No subscription — preview only
  none: null,
};

/**
 * Set a dev mock scenario. Only works when NEXT_PUBLIC_DEV_MOCK_ENABLED=true.
 * Call this from the browser console, then reload.
 */
export function setDevMock(scenario: MockScenario): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_MOCK_KEY, scenario);
  console.log(`[Steady Debug] Dev mock set to "${scenario}". Reload to apply.`);
}

/**
 * Clear the dev mock. Supabase will be used for real subscription data.
 */
export function clearDevMock(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEV_MOCK_KEY);
  console.log('[Steady Debug] Dev mock cleared. Reload to apply.');
}

/**
 * Read the active mock scenario from localStorage. Returns null if not set.
 */
export function getDevMockScenario(): MockScenario | null {
  if (typeof window === 'undefined') return null;
  if (process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED !== 'true') return null;
  const val = localStorage.getItem(DEV_MOCK_KEY);
  if (!val) return null;
  const valid: MockScenario[] = ['trialing', 'active', 'canceled', 'past_due', 'none'];
  return valid.includes(val as MockScenario) ? (val as MockScenario) : null;
}

/**
 * Get the mock Subscription object for the active scenario, or undefined if
 * mocks are disabled / not set.
 */
export function getMockSubscription(): Subscription | null | undefined {
  const scenario = getDevMockScenario();
  if (scenario === null) return undefined; // undefined = mocks not active
  return MOCK_SUBSCRIPTIONS[scenario];
}

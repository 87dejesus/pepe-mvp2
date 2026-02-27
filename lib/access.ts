/**
 * Access state management — The Steady One
 *
 * Single source of truth for subscription/trial access.
 * Works with both dev mocks (localStorage) and real Stripe checkouts.
 *
 * Dev mock usage (NEXT_PUBLIC_DEV_MOCK_ENABLED=true):
 *   localStorage.setItem('steady_dev_mock', 'trialing'); location.reload();
 *   localStorage.setItem('steady_dev_mock', 'active');   location.reload();
 *   localStorage.setItem('steady_dev_mock', 'canceled'); location.reload();
 *   localStorage.removeItem('steady_dev_mock');          location.reload();
 */

export type AccessStatus = 'trialing' | 'active' | 'canceled' | 'none';

export type AccessState = {
  status: AccessStatus;
  trial_end?: string; // ISO — present when status is 'trialing'
  set_at: string;     // ISO — when this state was written
};

const ACCESS_KEY = 'steady_access';
const DEV_MOCK_KEY = 'steady_dev_mock';

const VALID_STATUSES: AccessStatus[] = ['trialing', 'active', 'canceled', 'none'];

/**
 * Read the current access state.
 * Dev mock takes priority over real state when NEXT_PUBLIC_DEV_MOCK_ENABLED=true.
 */
export function readAccess(): AccessState {
  if (typeof window === 'undefined') {
    return { status: 'none', set_at: new Date().toISOString() };
  }

  // ── Dev mock (localStorage override) ──────────────────────────────────────
  if (process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true') {
    const mock = localStorage.getItem(DEV_MOCK_KEY);
    if (mock && VALID_STATUSES.includes(mock as AccessStatus)) {
      const status = mock as AccessStatus;
      const trial_end =
        status === 'trialing'
          ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days left
          : undefined;
      console.log(`[Steady Debug] readAccess: dev mock="${status}"`);
      return { status, trial_end, set_at: new Date().toISOString() };
    }
  }

  // ── Real access state (written after Stripe checkout) ─────────────────────
  const raw = localStorage.getItem(ACCESS_KEY);
  if (!raw) return { status: 'none', set_at: new Date().toISOString() };

  try {
    const state: AccessState = JSON.parse(raw);

    // If trial, check expiry
    if (state.status === 'trialing' && state.trial_end) {
      if (new Date(state.trial_end) <= new Date()) {
        console.log('[Steady Debug] readAccess: trial expired');
        return { status: 'none', set_at: state.set_at };
      }
    }

    return state;
  } catch {
    return { status: 'none', set_at: new Date().toISOString() };
  }
}

/**
 * Called after a successful Stripe checkout redirect (?checkout_success=1).
 * Writes a 3-day trial window to localStorage.
 */
export function activateTrialLocally(): void {
  const state: AccessState = {
    status: 'trialing',
    trial_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    set_at: new Date().toISOString(),
  };
  localStorage.setItem(ACCESS_KEY, JSON.stringify(state));
  console.log('[Steady Debug] activateTrialLocally: trial set until', state.trial_end);
}

/** True if the user has full access (trialing or active). */
export function hasAccess(state: AccessState): boolean {
  return state.status === 'trialing' || state.status === 'active';
}

/** Days remaining in trial (0 if not on trial or expired). */
export function trialDaysLeft(state: AccessState): number {
  if (state.status !== 'trialing' || !state.trial_end) return 0;
  const ms = new Date(state.trial_end).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

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

export type AccessStatus = 'trialing' | 'active' | 'canceled' | 'payment_failed' | 'none';

export type AccessState = {
  status: AccessStatus;
  trial_end?: string;          // ISO — present when status is 'trialing'
  current_period_end?: string; // ISO — present when status is 'canceled' (grace period)
  cache_expires_at?: string;   // ISO — when this server-verified cache entry expires (10 min)
  set_at: string;              // ISO — when this state was written
};

const ACCESS_KEY = 'steady_access';
const DEV_MOCK_KEY = 'steady_dev_mock';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const VALID_STATUSES: AccessStatus[] = ['trialing', 'active', 'canceled', 'payment_failed', 'none'];

/**
 * Read the current access state.
 * 'steady_dev_mock' is only honoured when NEXT_PUBLIC_DEV_MOCK_ENABLED=true
 * (local development only — never active in production builds).
 */
export function readAccess(): AccessState {
  if (typeof window === 'undefined') {
    return { status: 'none', set_at: new Date().toISOString() };
  }

  // ── Dev mock (localStorage override — only in local dev) ──────────────────
  if (process.env.NEXT_PUBLIC_DEV_MOCK_ENABLED === 'true') {
    const mock = localStorage.getItem(DEV_MOCK_KEY);
    if (mock && VALID_STATUSES.includes(mock as AccessStatus)) {
      const status = mock as AccessStatus;
      const trial_end =
        status === 'trialing'
          ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days left
          : undefined;
      console.log(`[Steady Debug] readAccess: mock="${status}"`);
      return { status, trial_end, set_at: new Date().toISOString() };
    }
  }

  // ── Real access state (server-verified cache) ─────────────────────────────
  const raw = localStorage.getItem(ACCESS_KEY);
  if (!raw) return { status: 'none', set_at: new Date().toISOString() };

  try {
    const state: AccessState = JSON.parse(raw);

    // If this is a server-verified cache entry, check the TTL first.
    // Expired cache → return 'none' to force a fresh server check.
    if (state.cache_expires_at && new Date(state.cache_expires_at) <= new Date()) {
      console.log('[Steady Debug] readAccess: server cache expired — forcing re-check');
      return { status: 'none', set_at: state.set_at };
    }

    // If trial, also enforce the trial_end timestamp
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
 * Caches server-verified access state in localStorage with a 10-minute TTL.
 * Called after /api/auth/access-status or /api/auth/start-trial responds.
 * localStorage is a short-lived cache only — never the source of truth.
 */
export function cacheServerAccess(serverState: {
  status: AccessStatus;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
}): void {
  const state: AccessState = {
    status: serverState.status,
    trial_end: serverState.trial_ends_at ?? undefined,
    current_period_end: serverState.current_period_end ?? undefined,
    cache_expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    set_at: new Date().toISOString(),
  };
  localStorage.setItem(ACCESS_KEY, JSON.stringify(state));
  console.log('[Steady Debug] cacheServerAccess: cached status', state.status, 'until', state.cache_expires_at);
}

/**
 * Invalidates the localStorage access cache, forcing the next readAccess()
 * to return 'none' and trigger a fresh server check.
 */
export function invalidateAccessCache(): void {
  localStorage.removeItem(ACCESS_KEY);
  console.log('[Steady Debug] invalidateAccessCache: cache cleared');
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

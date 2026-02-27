/**
 * useAccessGuard — React hook for client-side access control
 *
 * Call this at the top of DecisionClient (or any protected page).
 * It reads the anonymous user ID from localStorage, calls /api/auth/check-access,
 * and returns the resolved access level.
 *
 * Usage:
 *   const { access, daysLeft, userId } = useAccessGuard();
 *
 * Then in the render:
 *   - access === 'full'    → show all listings normally
 *   - access === 'preview' → show listing[0] fully, blur listing[1+]
 *   - access === 'blocked' → redirect to /paywall
 *   - access === 'loading' → show spinner
 *
 * ─── Dev Mock (no Stripe required) ───────────────────────────────────────────
 * When NEXT_PUBLIC_DEV_MOCK_ENABLED=true, set steady_dev_mock in localStorage:
 *
 *   localStorage.setItem('steady_dev_mock', 'trialing');  // 2 days left
 *   localStorage.setItem('steady_dev_mock', 'active');    // paid
 *   localStorage.setItem('steady_dev_mock', 'canceled'); // hard block
 *   localStorage.setItem('steady_dev_mock', 'past_due'); // payment failed
 *   localStorage.setItem('steady_dev_mock', 'none');      // preview only
 *   localStorage.removeItem('steady_dev_mock');           // real Supabase
 *
 * Then reload the page. The hook resolves instantly — no API call.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMockSubscription,
  getDevMockScenario,
} from '../subscription-engine/mock-subscriptions';
import {
  hasActiveAccess,
  isOnTrial,
  isCanceled,
  isPastDue,
  trialDaysRemaining,
} from '../subscription-engine/subscription-utils';

export type AccessLevel = 'full' | 'preview' | 'blocked' | 'loading';

type AccessGuardResult = {
  access: AccessLevel;
  daysLeft?: number;
  userId: string | null;
};

const USER_ID_KEY = 'steady_user_id';

/**
 * Get or create a persistent anonymous user ID.
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function useAccessGuard(): AccessGuardResult {
  const router = useRouter();
  const [access, setAccess] = useState<AccessLevel>('loading');
  const [daysLeft, setDaysLeft] = useState<number | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);

    // ── Dev mock: resolve without any API call ──────────────────────────────
    const mockScenario = getDevMockScenario();
    if (mockScenario !== null) {
      const mockSub = getMockSubscription();
      console.log(`[Steady Debug] useAccessGuard: using dev mock "${mockScenario}"`);

      if (mockSub === null || mockSub === undefined) {
        // 'none' scenario or mock disabled
        setAccess('preview');
        return;
      }

      if (hasActiveAccess(mockSub)) {
        setAccess('full');
        if (isOnTrial(mockSub)) {
          setDaysLeft(trialDaysRemaining(mockSub));
        }
      } else if (isCanceled(mockSub) || isPastDue(mockSub)) {
        const reason = isCanceled(mockSub) ? 'canceled' : 'payment_failed';
        router.push(`/paywall?reason=${reason}`);
      } else {
        setAccess('preview');
      }
      return;
    }

    // ── Real check via API ──────────────────────────────────────────────────
    async function checkAccess() {
      try {
        const res = await fetch(`/api/auth/check-access?userId=${encodeURIComponent(id)}`);
        if (!res.ok) {
          console.error('[Steady Debug] check-access HTTP error:', res.status);
          setAccess('preview'); // fail open
          return;
        }

        const data = await res.json();
        console.log('[Steady Debug] useAccessGuard result:', data);

        if (data.access === 'blocked') {
          router.push(`/paywall?reason=${data.reason ?? 'blocked'}`);
          return;
        }

        setAccess(data.access as AccessLevel);
        if (data.daysLeft !== undefined) {
          setDaysLeft(data.daysLeft);
        }
      } catch (err) {
        console.error('[Steady Debug] useAccessGuard fetch error:', err);
        setAccess('preview'); // fail open
      }
    }

    checkAccess();
  }, [router]);

  return { access, daysLeft, userId };
}

/**
 * Determines if a listing at a given index should be blurred (preview mode).
 * In preview mode, only the first listing (index 0) is fully visible.
 */
export function isBlurred(index: number, access: AccessLevel): boolean {
  return access === 'preview' && index > 0;
}

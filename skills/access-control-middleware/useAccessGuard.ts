/**
 * useAccessGuard — React hook for client-side access control
 *
 * Call this at the top of DecisionClient (or any protected page).
 * It reads the anonymous user ID from localStorage, calls /api/auth/check-access,
 * and returns the resolved access level.
 *
 * Usage:
 *   const { access, daysLeft, loading } = useAccessGuard();
 *
 * Then in the render:
 *   - access === 'full'    → show all listings normally
 *   - access === 'preview' → show listing[0] fully, blur listing[1+]
 *   - access === 'blocked' → redirect to /paywall
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type AccessLevel = 'full' | 'preview' | 'blocked' | 'loading';

type AccessGuardResult = {
  access: AccessLevel;
  daysLeft?: number;   // set when on trial
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

    async function checkAccess() {
      try {
        const res = await fetch(`/api/auth/check-access?userId=${encodeURIComponent(id)}`);
        if (!res.ok) {
          console.error('[Steady Debug] check-access HTTP error:', res.status);
          setAccess('preview'); // fail open — show preview
          return;
        }

        const data = await res.json();
        console.log('[Steady Debug] useAccessGuard result:', data);

        if (data.access === 'blocked') {
          const reason = data.reason ?? 'blocked';
          router.push(`/paywall?reason=${reason}`);
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

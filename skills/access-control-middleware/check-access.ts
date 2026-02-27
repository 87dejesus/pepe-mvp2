/**
 * API Route: GET /api/auth/check-access
 *
 * Checks subscription status for a userId and returns the access level.
 * Also sets the `steady_access` cookie so middleware can gate /decision.
 *
 * Usage:
 *   GET /api/auth/check-access?userId=<steady_user_id>
 *
 * Response:
 *   { access: 'full' | 'preview' | 'blocked', reason?: string, daysLeft?: number }
 *
 * ─── Dev Mock (server-side) ───────────────────────────────────────────────────
 * In development, pass ?mock=<scenario> to bypass Supabase:
 *   GET /api/auth/check-access?userId=test&mock=trialing
 *   GET /api/auth/check-access?userId=test&mock=active
 *   GET /api/auth/check-access?userId=test&mock=canceled
 *   GET /api/auth/check-access?userId=test&mock=past_due
 *   GET /api/auth/check-access?userId=test&mock=none
 * Only available when NODE_ENV=development. Ignored in production.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscription,
  hasActiveAccess,
  isCanceled,
  isPastDue,
  isOnTrial,
  trialDaysRemaining,
} from '../../subscription-engine/subscription-utils';
import {
  MOCK_SUBSCRIPTIONS,
  type MockScenario,
} from '../../subscription-engine/mock-subscriptions';

// Cookie TTL: 1 hour (subscription changes trigger a re-check)
const COOKIE_MAX_AGE = 60 * 60;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const mockParam = req.nextUrl.searchParams.get('mock');

  if (!userId) {
    return NextResponse.json({ access: 'preview', reason: 'no_user_id' });
  }

  // ── Dev mock via query param ─────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development' && mockParam) {
    const validScenarios: MockScenario[] = ['trialing', 'active', 'canceled', 'past_due', 'none'];
    if (validScenarios.includes(mockParam as MockScenario)) {
      const sub = MOCK_SUBSCRIPTIONS[mockParam as MockScenario];
      console.log(`[Steady Debug] check-access: dev mock="${mockParam}"`);
      return buildResponse(sub);
    }
  }

  // ── Real Supabase lookup ─────────────────────────────────────────────────
  const sub = await getSubscription(userId);

  console.log(`[Steady Debug] check-access: userId=${userId} status=${sub?.status ?? 'none'}`);
  return buildResponse(sub);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildResponse(sub: ReturnType<typeof getSubscription> extends Promise<infer T> ? T : never) {
  let access: 'full' | 'preview' | 'blocked';
  let reason: string | undefined;
  let daysLeft: number | undefined;

  if (hasActiveAccess(sub)) {
    access = 'full';
    if (isOnTrial(sub)) {
      daysLeft = trialDaysRemaining(sub);
    }
  } else if (isCanceled(sub)) {
    access = 'blocked';
    reason = 'canceled';
  } else if (isPastDue(sub)) {
    access = 'blocked';
    reason = 'payment_failed';
  } else {
    access = 'preview';
    reason = 'no_subscription';
  }

  const body: Record<string, unknown> = { access };
  if (reason) body.reason = reason;
  if (daysLeft !== undefined) body.daysLeft = daysLeft;

  const res = NextResponse.json(body);

  // Set access cookie (read by middleware)
  res.cookies.set('steady_access', access === 'blocked' ? 'blocked' : 'ok', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return res;
}

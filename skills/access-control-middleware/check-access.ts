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

// Cookie TTL: 1 hour (subscription changes trigger a re-check)
const COOKIE_MAX_AGE = 60 * 60;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { access: 'preview', reason: 'no_user_id' },
      { status: 200 }
    );
  }

  const sub = await getSubscription(userId);

  // Determine access level
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
    // No subscription at all
    access = 'preview';
    reason = 'no_subscription';
  }

  console.log(`[Steady Debug] check-access: userId=${userId} access=${access} reason=${reason}`);

  // Build response
  const body: Record<string, unknown> = { access };
  if (reason) body.reason = reason;
  if (daysLeft !== undefined) body.daysLeft = daysLeft;

  const res = NextResponse.json(body);

  // Set the access cookie (read by middleware)
  const cookieValue = access === 'blocked' ? 'blocked' : 'ok';
  res.cookies.set('steady_access', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return res;
}

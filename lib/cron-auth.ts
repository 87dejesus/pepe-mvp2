import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

// Timing-safe bearer compare. Returns false for length mismatch (itself a side
// channel, but cheap and acceptable for bearer tokens).
function safeBearerEquals(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Guard for Vercel Cron–only routes (sync, collect, cleanup, watchdog).
 *
 * Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` to cron
 * invocations when CRON_SECRET is set in the project env. Returns a
 * NextResponse to short-circuit the handler when unauthorized, or null when the
 * request is authorized and may proceed.
 *
 * Mirrors the scheme already used inline by app/api/cron/cleanup + watchdog so
 * every cron endpoint enforces the same check. Manual triggering now requires
 * the header: curl -H "Authorization: Bearer $CRON_SECRET" <url>
 */
export function denyIfNotCron(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('cron-auth: CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (!safeBearerEquals(req.headers.get('authorization'), `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

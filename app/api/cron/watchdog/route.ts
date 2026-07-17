import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Scraper watchdog.
// Runs daily. Reads the listings table and raises a Sentry alert when the
// catalog is dangerously low or has gone stale, so a silent scraper failure
// can't drain the DB unnoticed again (see PROJECT_BRIEF incident 2026-05-19).
// Read-only: it never writes to listings.

// Below this many Active listings, /decision quality collapses and risks the
// hardcoded mock fallback. Override per-environment with WATCHDOG_MIN_ACTIVE.
const DEFAULT_MIN_ACTIVE = 20;
// The scraper cron runs every 3 days. If nothing Active was updated within this
// window, a sync cycle was almost certainly missed. Override with WATCHDOG_FRESH_DAYS.
const DEFAULT_FRESH_DAYS = 4;

// Direct founder alert. The 2026-07 catalog outage showed Sentry-only alerting
// fails silently when nobody watches Sentry: the scraper died on Jul 1, this
// watchdog flagged it daily, and the empty catalog was only noticed by hand on
// Jul 17. Email is the channel the founder actually reads.
async function sendAlertEmail(
  message: string,
  stats: { active: number; fresh: number; minActive: number; freshDays: number }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Cron watchdog: RESEND_API_KEY not set, skipping email alert');
    return;
  }
  const to = process.env.ALERT_EMAIL || 'luhciano.sj@gmail.com';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Steady Watchdog <noreply@contact.thesteadyone.com>',
        to: [to],
        subject: `[The Steady One] Listings alert: ${stats.active} active`,
        text: [
          message,
          '',
          `Active listings: ${stats.active} (floor: ${stats.minActive})`,
          `Fresh in last ${stats.freshDays} days: ${stats.fresh}`,
          '',
          'Check the Apify runs: https://console.apify.com/actors/runs',
          'When the catalog is empty, /decision shows the honest empty state (no more fake mocks).',
        ].join('\n'),
      }),
    });
    if (!res.ok) {
      console.error('Cron watchdog: alert email failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('Cron watchdog: alert email error', err);
  }
}

// Timing-safe bearer compare. Mirrors app/api/cron/cleanup/route.ts.
function safeBearerEquals(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Auth: same CRON_SECRET bearer scheme as the cleanup cron.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('Cron watchdog: CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (!safeBearerEquals(request.headers.get('authorization'), `Bearer ${cronSecret}`)) {
    console.log('Cron watchdog: Unauthorized attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const minActive = Number(process.env.WATCHDOG_MIN_ACTIVE) || DEFAULT_MIN_ACTIVE;
  const freshDays = Number(process.env.WATCHDOG_FRESH_DAYS) || DEFAULT_FRESH_DAYS;
  const freshCutoff = new Date(Date.now() - freshDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Total Active listings (head:true => count only, no rows transferred).
    const { count: activeCount, error: activeErr } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Active');
    if (activeErr) throw activeErr;

    // Active listings touched within the freshness window.
    const { count: freshCount, error: freshErr } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Active')
      .gte('updated_at', freshCutoff);
    if (freshErr) throw freshErr;

    const active = activeCount ?? 0;
    const fresh = freshCount ?? 0;

    const reasons: string[] = [];
    if (active < minActive) reasons.push(`only ${active} Active listings (floor ${minActive})`);
    if (fresh === 0) reasons.push(`nothing updated in the last ${freshDays} days (scraper likely stalled)`);
    const healthy = reasons.length === 0;

    if (!healthy) {
      const message = `[watchdog] Listings unhealthy: ${reasons.join('; ')}`;
      console.error('Cron watchdog:', message);
      Sentry.captureMessage(message, {
        level: 'error',
        tags: { area: 'scraper-watchdog' },
        extra: { active, fresh, minActive, freshDays, freshCutoff },
      });
      // Serverless: make sure the event ships before the function freezes.
      await Sentry.flush(2000);
      // Sentry alone proved insufficient: the 2026-07 outage fired here daily
      // for two weeks and nobody saw it. Email the founder directly via Resend.
      // Requires RESEND_API_KEY (and optionally ALERT_EMAIL) in the environment;
      // silently skipped when absent so the watchdog itself never fails.
      await sendAlertEmail(message, { active, fresh, minActive, freshDays });
    } else {
      console.log(`Cron watchdog: healthy (${active} active, ${fresh} fresh in ${freshDays}d)`);
    }

    return NextResponse.json({
      healthy,
      active,
      fresh,
      thresholds: { minActive, freshDays },
      reasons,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Cron watchdog: query failed', msg);
    Sentry.captureException(error, { tags: { area: 'scraper-watchdog' } });
    await Sentry.flush(2000);
    return NextResponse.json({ error: 'Watchdog query failed', details: msg }, { status: 500 });
  }
}

/**
 * POST /api/apify/sync
 *
 * Fire-and-forget: starts ONE memo23/streeteasy-ppr run PER BOROUGH (5 runs)
 * and saves every runId to the sync_runs table, then returns immediately.
 * Results are collected by GET /api/apify/collect (~25 min later by cron, plus
 * a daily retry).
 *
 * Why one run per borough (changed 2026-09-01): the actor used to apply
 * `maxItems` PER start URL — 40 x 5 URLs returned ~190 items. The Apify run
 * history shows that behaviour changed: runs dropped from 193/191/188 results
 * to a flat 40-41, i.e. `maxItems` became a cap on the WHOLE run, so we were
 * paying for one borough's worth of listings (almost certainly all Manhattan,
 * the first start URL) and starving the other four. Giving each borough its own
 * run makes the five-borough spread independent of how the actor chooses to
 * read `maxItems`. Five run starts cost $0.006 each — $0.03 total, noise.
 *
 * Actor: memo23/streeteasy-ppr (adopted 2026-07-17). Replaces saswave, which
 * apartments.com hard-blocked starting Jul 1 (every run failed at the first
 * page fetch; the outage drained the catalog to zero for ~10 days). StreetEasy
 * is the NYC-native source: real neighborhood names, numeric price, public
 * photos.zillowstatic.com images, listing URLs NYC renters already trust.
 * Bundled proxy (its `proxy` input is an optional override), maxItems
 * supported, actively maintained. Evaluated + live-spiked via
 * /scraper-provider-evaluator on 2026-07-17. See lib/streeteasy-normalize.ts.
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred — allows write without RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback)
 *   APIFY_TOKEN                     (required)
 *   STEADY_SE_MAX_ITEMS             (optional — overrides default 200)
 *
 * NOTE: the actor is hardcoded below (not env-driven). A leftover Vercel env
 * var APIFY_ACTOR_ID was silently forcing the dead epctex actor once. Safe to
 * delete that env var in Vercel; it is no longer read.
 *
 * SQL — run once in Supabase before deploying:
 *   CREATE TABLE sync_runs (
 *     id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     run_id     text        NOT NULL,
 *     status     text        NOT NULL DEFAULT 'started',
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { denyIfNotCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Hardcoded intentionally. A stale Vercel env var APIFY_ACTOR_ID=epctex~...
// silently overrode the actor on 2026-06-07 and kept routing runs to the dead
// epctex actor. The actor choice belongs in code, not in a forgotten env toggle.
// To change actors, edit this line.
const APIFY_ACTOR_ID = 'memo23~streeteasy-ppr';

// Borough-specific search URLs. Do NOT use /for-rent/nyc: StreetEasy's "nyc"
// feed includes New Jersey and a live 200-item run came back 73% NJ (audited
// 2026-07-17; the ZIP filter caught it, but we were paying for garbage).
// Per-borough URLs returned 0% NJ with an even five-borough spread.
const SEARCH_URLS = [
  'https://streeteasy.com/for-rent/manhattan',
  'https://streeteasy.com/for-rent/brooklyn',
  'https://streeteasy.com/for-rent/queens',
  'https://streeteasy.com/for-rent/bronx',
  'https://streeteasy.com/for-rent/staten-island',
];

// Cost control: $0.003/item + $0.006/run start. One run per borough, so this
// is a true per-run cap: 40 × 5 boroughs ≈ 200 items every 3 days ≈ $0.63
// ≈ $6/month. Tune via env.
const MAX_ITEMS_PER_BOROUGH = Number(process.env.STEADY_SE_MAX_ITEMS ?? 40);

// Hard wall-clock limit per run, in seconds. Two runs TIMED OUT in the Apify
// history (2026-09-01) after hanging well past the 25-min collect window, which
// silently costs a whole 3-day cycle. An explicit 15-min timeout guarantees
// every run is finished — SUCCEEDED or TIMED-OUT — before collect looks at it,
// and collect already harvests the partial dataset of a non-SUCCEEDED run.
const RUN_TIMEOUT_SECS = Number(process.env.STEADY_SE_RUN_TIMEOUT ?? 900);

async function startApifyRun(startUrl: string): Promise<string> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN env var is not set');

  const body = JSON.stringify({
    startUrls: [{ url: startUrl }],
    maxItems: MAX_ITEMS_PER_BOROUGH,
    enrichEmails: false,
    moreResults: false,
  });

  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}&timeout=${RUN_TIMEOUT_SECS}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Apify start HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const runId: string = data?.data?.id;
  if (!runId) throw new Error('Apify run start did not return a runId');
  return runId;
}

export async function GET(req: NextRequest) {
  const denied = denyIfNotCron(req);
  if (denied) return denied;
  return runSync();
}

export async function POST(req: NextRequest) {
  const denied = denyIfNotCron(req);
  if (denied) return denied;
  return runSync();
}

async function runSync() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  // One run per borough, started in parallel. A borough that fails to start
  // must not cost us the other four, so this is allSettled, not all.
  const settled = await Promise.allSettled(SEARCH_URLS.map((url) => startApifyRun(url)));

  const runIds: string[] = [];
  const failures: string[] = [];

  settled.forEach((result, i) => {
    const url = SEARCH_URLS[i];
    if (result.status === 'fulfilled') {
      runIds.push(result.value);
      console.log(`[Steady Debug] Apify run started for ${url}: ${result.value}`);
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failures.push(`${url}: ${msg}`);
      console.error(`[Steady Debug] Failed to start Apify run for ${url}:`, msg);
    }
  });

  if (runIds.length === 0) {
    return NextResponse.json(
      { error: 'No Apify run could be started', failures },
      { status: 500 }
    );
  }

  const { error } = await db
    .from('sync_runs')
    .insert(runIds.map((run_id) => ({ run_id, status: 'started' })));

  if (error) {
    // Non-fatal — the runIds are logged above; collect can be triggered manually
    console.error('[Steady Debug] Failed to save sync_runs:', error.message);
  }

  return NextResponse.json({
    status: 'started',
    started: runIds.length,
    runIds,
    failures,
  });
}

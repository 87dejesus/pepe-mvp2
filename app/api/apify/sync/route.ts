/**
 * POST /api/apify/sync
 *
 * Fire-and-forget: starts the memo23/streeteasy-ppr run and saves the runId to
 * the sync_runs table, then returns immediately. Results are collected by
 * GET /api/apify/collect (run ~25 min later by cron).
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

// streeteasy.com/for-rent/nyc covers all five boroughs; the collect-side
// normalizer derives borough from ZIP and rejects anything non-NYC.
const SEARCH_URL = 'https://streeteasy.com/for-rent/nyc';

// Cost control: $0.003/item + $0.006/run start. 200 items every 3 days
// ≈ $0.61/run ≈ $6/month. Tune via env.
const MAX_ITEMS = Number(process.env.STEADY_SE_MAX_ITEMS ?? 200);

async function startApifyRun(): Promise<string> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN env var is not set');

  const body = JSON.stringify({
    startUrls: [{ url: SEARCH_URL }],
    maxItems: MAX_ITEMS,
    enrichEmails: false,
    moreResults: false,
  });

  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${token}`,
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

  let runId: string;
  try {
    runId = await startApifyRun();
    console.log(`[Steady Debug] Apify run started: ${runId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Steady Debug] Failed to start Apify run:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { error } = await db
    .from('sync_runs')
    .insert({ run_id: runId, status: 'started' });

  if (error) {
    // Non-fatal — runId is logged above; collect can be triggered manually
    console.error('[Steady Debug] Failed to save sync_run:', error.message);
  }

  return NextResponse.json({ status: 'started', runId });
}

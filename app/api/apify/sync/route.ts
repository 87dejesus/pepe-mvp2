/**
 * POST /api/apify/sync
 *
 * Fire-and-forget: starts the saswave advanced-apartments-com-scraper run and
 * saves the runId to the sync_runs table, then returns immediately.
 * Results are collected by GET /api/apify/collect (run ~25 min later by cron).
 *
 * Actor: saswave/advanced-apartments-com-scraper (adopted 2026-06-08). Replaces
 * ParseForge, which returned good data but relied on OUR Apify proxy that
 * apartments.com blocks at any volume (worked at 3 items, blocked at 50).
 * saswave bundles its own proxy infra (no proxyConfiguration input), so the
 * anti-bot problem is the actor's, not ours — a single run pulled 40 listings
 * with no block. Returns numeric rent + public CDN images. See
 * lib/saswave-normalize.ts.
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred — allows write without RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback)
 *   APIFY_TOKEN                     (required)
 *   SASWAVE_MAX_PAGES              (optional — overrides default 5; ~40 listings/page)
 *
 * NOTE: the actor is hardcoded below (not env-driven). A leftover Vercel env
 * var APIFY_ACTOR_ID was silently forcing the dead epctex actor. Safe to delete
 * that env var in Vercel; it is no longer read.
 *
 * SQL — run once in Supabase before deploying:
 *   CREATE TABLE sync_runs (
 *     id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     run_id     text        NOT NULL,
 *     status     text        NOT NULL DEFAULT 'started',
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Hardcoded intentionally. A stale Vercel env var APIFY_ACTOR_ID=epctex~...
// silently overrode the actor on 2026-06-07 and kept routing runs to the dead
// epctex actor. The actor choice belongs in code, not in a forgotten env toggle.
// To change actors, edit this line.
const APIFY_ACTOR_ID = 'saswave~advanced-apartments-com-scraper';

// apartments.com/new-york-ny/ surfaces listings across all five boroughs. The
// collect-side normalizer derives borough from ZIP and rejects non-NYC bleed
// (Yonkers, Mount Vernon, NJ).
const SEARCH_URL = 'https://www.apartments.com/new-york-ny/';

// Cost control: ~$0.001/result, ~40 listings/page. 5 pages ≈ 200 listings every
// 3 days ≈ $2/month. Tune via env.
const MAX_PAGES = Number(process.env.SASWAVE_MAX_PAGES ?? 5);

async function startApifyRun(): Promise<string> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN env var is not set');

  const body = JSON.stringify({
    search_url: SEARCH_URL,
    max_pages: MAX_PAGES,
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

export async function GET() {
  return POST();
}

export async function POST() {
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

/**
 * POST /api/apify/sync
 *
 * Fire-and-forget: starts the Apify Apartments.com actor run and saves the
 * runId to the sync_runs table, then returns immediately.
 * Results are collected by GET /api/apify/collect (run ~10 min later by cron).
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred — allows write without RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback)
 *   APIFY_TOKEN                     (required)
 *   APIFY_ACTOR_ID                  (optional — overrides default actor)
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

const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'epctex~apartments-scraper-api';

async function startApifyRun(): Promise<string> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN env var is not set');

  const body = JSON.stringify({
    startUrls: [
      'https://www.apartments.com/new-york-ny/',
      'https://www.apartments.com/brooklyn-ny/',
      'https://www.apartments.com/bronx-ny/',
      'https://www.apartments.com/queens-ny/',
      'https://www.apartments.com/staten-island-ny/',
    ],
    includeReviews: false,
    includeVisuals: false,
    includeInteriorAmenities: true,
    includeWalkScore: false,
    maxItems: 200,
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

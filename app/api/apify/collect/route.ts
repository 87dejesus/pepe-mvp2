/**
 * GET /api/apify/collect
 *
 * Checks EVERY pending Apify run (from sync_runs) — /api/apify/sync starts one
 * per borough — fetches their results, normalizes and upserts listings to
 * Supabase. A run still going is left pending for the next pass; one bad run
 * never costs us the other four.
 *
 * Called by Vercel cron at 6:25 UTC (25 min after /api/apify/sync), plus a
 * daily retry at 12:00 UTC. The retry exists because this route polls each
 * Apify run exactly ONCE: a run still RUNNING at 6:25 used to lose its whole
 * batch until the next sync three days later. The retry is free when there is
 * nothing to do (it exits at `no_pending_run` before touching Apify or the
 * listings table) and it also picks up a run that finished hours late.
 *
 * Also callable manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://www.thesteadyone.com/api/apify/collect
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback)
 *   APIFY_TOKEN                     (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { denyIfNotCron } from '@/lib/cron-auth';
import type { ApifyListing } from '@/lib/apify-normalize';
import { normalizeStreetEasyItem, type StreetEasyItem } from '@/lib/streeteasy-normalize';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = denyIfNotCron(req);
  if (denied) return denied;
  return collect();
}

export async function POST(req: NextRequest) {
  const denied = denyIfNotCron(req);
  if (denied) return denied;
  return collect();
}

async function collect() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = process.env.APIFY_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  if (!token) {
    return NextResponse.json({ error: 'APIFY_TOKEN not set' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  // 1. Every pending run — sync starts one per borough. The limit is a safety
  // net against a backlog of stranded rows, not an expected case.
  const { data: runRows, error: runErr } = await db
    .from('sync_runs')
    .select('id, run_id')
    .eq('status', 'started')
    .order('created_at', { ascending: false })
    .limit(10);

  if (runErr) {
    return NextResponse.json({ error: `sync_runs query failed: ${runErr.message}` }, { status: 500 });
  }
  if (!runRows || runRows.length === 0) {
    return NextResponse.json({ status: 'no_pending_run' });
  }

  // 2-3. Poll each run and harvest its dataset. Everything in this loop is
  // per-run and non-fatal: a poll that errors, or a borough that came back
  // empty, must not discard the boroughs that worked.
  const raw: StreetEasyItem[] = [];
  const collectedRowIds: string[] = [];
  const perRun: { runId: string; runStatus: string; items: number; note?: string }[] = [];
  let stillPending = 0;

  for (const { id: syncRunId, run_id: runId } of runRows) {
    const pollRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      { cache: 'no-store' }
    );
    if (!pollRes.ok) {
      console.error(`[Steady Debug] Apify poll HTTP ${pollRes.status} for run ${runId}`);
      perRun.push({ runId, runStatus: 'poll_failed', items: 0, note: `HTTP ${pollRes.status}` });
      continue;
    }
    const pollData = await pollRes.json();
    const runStatus: string = pollData?.data?.status ?? '';
    console.log(`[Steady Debug] Apify run ${runId} status: ${runStatus}`);

    if (runStatus === 'RUNNING' || runStatus === 'READY') {
      stillPending++;
      perRun.push({ runId, runStatus, items: 0 });
      continue;
    }

    // Tolerate non-SUCCEEDED runs as long as the dataset has items (a partial
    // batch is still complete, valid rows — this is what rescues a TIMED-OUT
    // run), and only give up when there is genuinely nothing to upsert.
    const itemsRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&clean=true`,
      { cache: 'no-store' }
    );
    if (!itemsRes.ok) {
      console.error(`[Steady Debug] Apify items HTTP ${itemsRes.status} for run ${runId}`);
      perRun.push({ runId, runStatus, items: 0, note: `items HTTP ${itemsRes.status}` });
      continue;
    }
    const items: StreetEasyItem[] = await itemsRes.json();
    console.log(`[Steady Debug] streeteasy: run ${runId} returned ${items.length} raw items (status: ${runStatus})`);

    if (items.length === 0) {
      await db.from('sync_runs').update({ status: 'failed' }).eq('id', syncRunId);
      perRun.push({ runId, runStatus, items: 0, note: 'no items' });
      continue;
    }
    if (runStatus !== 'SUCCEEDED') {
      console.warn(`[Steady Debug] streeteasy run ${runId} ${runStatus} but has ${items.length} usable items — processing partial batch`);
    }

    raw.push(...items);
    collectedRowIds.push(syncRunId);
    perRun.push({ runId, runStatus, items: items.length });
  }

  console.log(`[Steady Debug] streeteasy: ${raw.length} raw items across ${collectedRowIds.length} run(s), ${stillPending} still running`);

  if (raw.length === 0) {
    return NextResponse.json({
      status: stillPending > 0 ? 'pending' : 'failed',
      reason: stillPending > 0 ? 'runs still going' : 'no items in any run',
      runs: perRun,
    });
  }

  // 4. Normalize
  const normalized: ApifyListing[] = raw
    .map(normalizeStreetEasyItem)
    .filter((x): x is ApifyListing => x !== null);
  console.log(`[Steady Debug] streeteasy: normalized ${normalized.length}/${raw.length} items`);
  console.log(
    '[Normalize Debug]',
    JSON.stringify(
      normalized.slice(0, 5).map((i) => ({ price: i.price, image: !!i.image_url, borough: i.borough, address: i.address }))
    )
  );

  // 5. Upsert to Supabase. Unlike saswave (whose neighborhood was just the
  // borough), StreetEasy's areaName is a real neighborhood (Yorkville, NoMad),
  // so neighborhood and description are now included. pets stays excluded
  // (this actor doesn't expose it at search level; 'Unknown' would clobber
  // legacy data for nothing).
  let synced = 0;
  let dbError: string | null = null;
  const nowIso = new Date().toISOString();

  if (normalized.length > 0) {
    const dbRows = normalized.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _id, amenities: _am, images: _im, pets: _p, ...rest }) => rest
    );

    const seenUrls = new Set<string>();
    const uniqueDbRows = dbRows
      .filter(row => {
        if (seenUrls.has(row.original_url)) return false;
        seenUrls.add(row.original_url);
        return true;
      })
      // Stamp freshness explicitly. `updated_at` has a DEFAULT now(), but a
      // DEFAULT only fires on INSERT: an upsert that resolves to UPDATE (every
      // listing we re-scrape, which is most of them) left updated_at frozen at
      // the day the row was first seen. Consequences observed 2026-09-01:
      // the cleanup cron expires Active rows with updated_at older than 10 days,
      // so still-live listings were being killed 10 days after first sight and
      // instantly re-expired after each re-scrape, and the watchdog's freshness
      // check ("fresh in last 4 days") counted only brand-new URLs, firing
      // stall alerts while the scraper was in fact running.
      .map(row => ({ ...row, updated_at: nowIso }));

    const { error } = await db
      .from('listings')
      .upsert(uniqueDbRows, { onConflict: 'original_url', ignoreDuplicates: false });

    if (error) {
      console.error('[Steady Debug] Supabase upsert error:', error.message);
      dbError = error.message;
    } else {
      synced = uniqueDbRows.length;
      console.log(`[Steady Debug] Upserted ${synced} listings to Supabase`);

      // Patch null neighborhoods: set neighborhood = borough as fallback
      const { data: nullRows } = await db
        .from('listings')
        .select('borough')
        .is('neighborhood', null)
        .not('borough', 'is', null);

      if (nullRows && nullRows.length > 0) {
        const boroughs = [...new Set(nullRows.map((r: { borough: string }) => r.borough))];
        for (const b of boroughs) {
          await db
            .from('listings')
            .update({ neighborhood: b })
            .is('neighborhood', null)
            .eq('borough', b);
        }
        console.log(`[Steady Debug] Patched null neighborhoods for: ${boroughs.join(', ')}`);
      }
    }
  }

  // 6. Mark the harvested runs as collected. Runs still going keep 'started'
  // so the next pass — or the daily retry cron — picks them up.
  if (collectedRowIds.length > 0) {
    await db.from('sync_runs').update({ status: 'collected' }).in('id', collectedRowIds);
  }

  return NextResponse.json({
    status: 'collected',
    synced,
    dbError,
    stillPending,
    runs: perRun,
  });
}

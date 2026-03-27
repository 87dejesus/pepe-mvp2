/**
 * GET /api/apify/collect
 *
 * Checks the most recent pending Apify run (from sync_runs), fetches results
 * if SUCCEEDED, normalizes and upserts listings to Supabase.
 *
 * Called by Vercel cron at 6:10 UTC (10 min after /api/apify/sync).
 * Also callable manually: curl https://thesteadyone.com/api/apify/collect
 *
 * Env vars used:
 *   NEXT_PUBLIC_SUPABASE_URL        (required)
 *   SUPABASE_SERVICE_ROLE_KEY       (preferred)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (fallback)
 *   APIFY_TOKEN                     (required)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeItem, ApifyListing, ApartmentsItem } from '@/lib/apify-normalize';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  return collect();
}

export async function POST() {
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

  // 1. Get the most recent pending run
  const { data: runRow, error: runErr } = await db
    .from('sync_runs')
    .select('id, run_id')
    .eq('status', 'started')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (runErr || !runRow) {
    return NextResponse.json({ status: 'no_pending_run' });
  }

  const { id: syncRunId, run_id: runId } = runRow;

  // 2. Check Apify run status — single check, no polling loop
  const pollRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
    { cache: 'no-store' }
  );
  if (!pollRes.ok) {
    return NextResponse.json(
      { error: `Apify poll HTTP ${pollRes.status}: ${pollRes.statusText}` },
      { status: 500 }
    );
  }
  const pollData = await pollRes.json();
  const runStatus: string = pollData?.data?.status ?? '';
  console.log(`[Steady Debug] Apify run ${runId} status: ${runStatus}`);

  if (runStatus === 'RUNNING' || runStatus === 'READY') {
    return NextResponse.json({ status: 'pending', runId, runStatus });
  }

  if (runStatus !== 'SUCCEEDED') {
    await db.from('sync_runs').update({ status: 'failed' }).eq('id', syncRunId);
    return NextResponse.json({ status: 'failed', runId, runStatus });
  }

  // 3. Fetch dataset items
  const itemsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&clean=true`,
    { cache: 'no-store' }
  );
  if (!itemsRes.ok) {
    return NextResponse.json(
      { error: `Apify items HTTP ${itemsRes.status}: ${itemsRes.statusText}` },
      { status: 500 }
    );
  }
  const raw: ApartmentsItem[] = await itemsRes.json();
  console.log(`[Steady Debug] Apify: fetched ${raw.length} raw items`);
  console.log('[Model Debug]', JSON.stringify({contact: (raw[0] as any)?.contact, model0: (raw[0] as any)?.models?.[0]}));

  // 4. Normalize
  const normalized: ApifyListing[] = raw
    .map(normalizeItem)
    .filter((x): x is ApifyListing => x !== null);
  console.log(`[Steady Debug] Apify: normalized ${normalized.length}/${raw.length} items`);
  console.log('[Normalize Debug]', JSON.stringify(normalized.slice(0,5).map((i: any) => ({id: i.id, image_url: i.image_url, address: i.address}))));

  // 5. Upsert to Supabase (neighborhood, pets, description excluded to protect curated data)
  let synced = 0;
  let dbError: string | null = null;

  if (normalized.length > 0) {
    const dbRows = normalized.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _id, amenities: _am, images: _im, neighborhood: _n, pets: _p, description: _d, ...rest }) => rest
    );

    const seenUrls = new Set<string>();
    const uniqueDbRows = dbRows.filter(row => {
      if (seenUrls.has(row.original_url)) return false;
      seenUrls.add(row.original_url);
      return true;
    });

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

  // 6. Mark sync_run as collected
  await db.from('sync_runs').update({ status: 'collected' }).eq('id', syncRunId);

  return NextResponse.json({ status: 'collected', synced, dbError });
}

/**
 * POST /api/onboarding/save-source
 *
 * Saves the user's referral source to the `users` table.
 * Called fire-and-forget from /onboarding/source — always returns 200
 * so the client doesn't have to handle errors from this non-critical step.
 *
 * If the user is not yet authenticated the value is silently dropped here;
 * it is already persisted to localStorage by the client and can be synced later.
 *
 * Requires Supabase migration:
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source TEXT;
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Silently succeed if not authenticated — localStorage holds the value
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, saved: false });
  }

  const body = await req.json().catch(() => ({})) as { source?: unknown };
  const source =
    typeof body.source === 'string' ? body.source.trim().slice(0, 120) : null;

  if (!source) {
    return NextResponse.json({ ok: true, saved: false });
  }

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('users')
    .upsert({ id: user.id, referral_source: source }, { onConflict: 'id' });

  if (error) {
    console.error('[save-source] DB error:', error.message);
    // Still return 200 — this is non-critical
  } else {
    console.log(`[save-source] Saved "${source}" for user ${user.id}`);
  }

  return NextResponse.json({ ok: true, saved: !error });
}

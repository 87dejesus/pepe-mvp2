/**
 * GET /api/auth/access-status
 *
 * Server-authoritative source of truth for the current user's access state.
 * Authenticates via Supabase session cookie, then queries the users table.
 *
 * Returns:
 *   200 { status: 'new_user', trial_ends_at: null, current_period_end: null }
 *     — authenticated user with no row in users table (never trialed or paid)
 *
 *   200 { status, trial_ends_at, current_period_end }
 *     — status: 'trialing' | 'active' | 'canceled' | 'payment_failed' | 'none'
 *
 *   401 { error: 'Not authenticated' }
 *     — no valid session cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSupabaseServerRouteClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  // Authenticate via session cookie
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const authCookies = allCookies.filter(c => c.name.includes('sb-') || c.name.includes('supabase'));
  console.log('[access-status] auth cookies present:', authCookies.map(c => c.name));

  const supabase = createSupabaseServerRouteClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[access-status] getUser result — user:', user?.email ?? null, '| error:', authError?.message ?? null);

  if (authError || !user) {
    console.warn('[access-status] 401 — not authenticated. authError:', authError?.message ?? 'none');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Query users table via service role (bypasses RLS)
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('users')
    .select('subscription_status, trial_ends_at, current_period_end')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[access-status] DB error:', error.message);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!data) {
    // No row — user authenticated but never started a trial or paid
    console.log('[access-status] no DB row for user', user.id, '→ new_user');
    return NextResponse.json({
      status: 'new_user',
      trial_ends_at: null,
      current_period_end: null,
    });
  }

  const status = data.subscription_status ?? 'none';
  const grantsAccess = status === 'trialing' || status === 'active';
  console.log(
    `[access-status] DB row found | status: ${status} | trial_ends_at: ${data.trial_ends_at ?? 'null'} | current_period_end: ${data.current_period_end ?? 'null'} | grants_access: ${grantsAccess}`
  );
  if (grantsAccess) {
    console.log(`[access-status] granting access — status is ${status}`);
  }
  return NextResponse.json({
    status,
    trial_ends_at: data.trial_ends_at ?? null,
    current_period_end: data.current_period_end ?? null,
  });
}

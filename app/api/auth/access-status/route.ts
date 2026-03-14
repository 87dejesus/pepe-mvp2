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
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  // Authenticate via session cookie
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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
    return NextResponse.json({
      status: 'new_user',
      trial_ends_at: null,
      current_period_end: null,
    });
  }

  return NextResponse.json({
    status: data.subscription_status ?? 'none',
    trial_ends_at: data.trial_ends_at ?? null,
    current_period_end: data.current_period_end ?? null,
  });
}

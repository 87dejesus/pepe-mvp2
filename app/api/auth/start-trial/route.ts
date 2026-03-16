/**
 * POST /api/auth/start-trial
 *
 * Grants a 3-day free trial to the authenticated user.
 * Each Supabase user may only receive one trial — enforced server-side.
 *
 * Returns:
 *   200 { status: 'trialing', trial_ends_at }  — trial started
 *   409 { error: 'trial_already_used', status, trial_ends_at }  — trial already granted
 *   401 { error: 'Not authenticated' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSupabaseServerRouteClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  // Authenticate via session cookie
  const cookieStore = await cookies();
  const supabase = createSupabaseServerRouteClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createSupabaseServiceClient();

  // Check if this user already has a trial_ends_at — if so, deny
  const { data: existing, error: fetchError } = await db
    .from('users')
    .select('subscription_status, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('[start-trial] DB fetch error:', fetchError.message);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (existing?.trial_ends_at) {
    // Trial was already granted — return 409 with current state so client can route correctly
    console.warn(`[start-trial] User ${user.id} already used trial — status: ${existing.subscription_status}`);
    return NextResponse.json(
      {
        error: 'trial_already_used',
        status: existing.subscription_status,
        trial_ends_at: existing.trial_ends_at,
      },
      { status: 409 }
    );
  }

  // Grant trial
  const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { error: upsertError } = await db.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    console.error('[start-trial] DB upsert error:', upsertError.message);
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }

  console.log(`[start-trial] Trial granted to user ${user.id} until ${trialEndsAt}`);
  return NextResponse.json({ status: 'trialing', trial_ends_at: trialEndsAt });
}

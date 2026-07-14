/**
 * POST /api/track/event
 *
 * Records a funnel event for attribution analytics. Fired client-side at each
 * step of the funnel (quiz_start -> quiz_complete -> paywall_view ->
 * checkout_start -> paid) with the first-touch UTM params.
 *
 * Body: { event, utm_source?, utm_medium?, utm_campaign?, path? }
 *
 * Security:
 *   - event must be in the allowlist (no arbitrary writes)
 *   - string fields are length-capped
 *   - user_id is read from the session cookie, never trusted from the body
 *   - always returns 204, even on failure: tracking must never surface as an
 *     error in the user flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
  'quiz_start',
  'quiz_complete',
  'paywall_view',
  // Post-paywall sign-in instrumentation (free model)
  'signup_started',
  'otp_sent',
  'otp_submitted',
  'otp_error',
  'access_granted',
  'checkout_start',
  'paid',
]);

const NO_CONTENT = new NextResponse(null, { status: 204 });

function clean(value: unknown, max = 100): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NO_CONTENT;
  }

  const event = clean(payload.event, 40);
  // Unknown/missing event: accept silently, never error the client flow.
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return NO_CONTENT;
  }

  // Read user_id from the session cookie. Never trust an id from the body.
  let user_id: string | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {}, // read-only
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    user_id = data.user?.id ?? null;
  } catch {
    // anonymous event is expected for the top of the funnel
  }

  // Insert via anon key (respects RLS insert policy).
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { error } = await supabase.from('funnel_events').insert({
      user_id,
      event,
      utm_source: clean(payload.utm_source),
      utm_medium: clean(payload.utm_medium),
      utm_campaign: clean(payload.utm_campaign),
      path: clean(payload.path, 200),
    });
    if (error) {
      console.error('[TrackEvent] DB insert error (non-blocking):', error.message);
    }
  } catch (err) {
    console.error('[TrackEvent] Unexpected error (non-blocking):', err);
  }

  return NO_CONTENT;
}

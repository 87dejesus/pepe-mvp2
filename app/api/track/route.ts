/**
 * GET /api/track
 *
 * Tracks an affiliate click and redirects to the target URL.
 * Works as a plain href — no JS required.
 *
 * Query params:
 *   partner     (required) — affiliate partner identifier, e.g. "extraspace"
 *   target_url  (required) — destination URL (must be in ALLOWED_HOSTS, https only)
 *   source      (optional) — originating page, e.g. "storage"
 *
 * Security:
 *   - Only https:// URLs accepted
 *   - Exact hostname match against allowlist (no subdomains, no www tricks)
 *   - Internal/private IPs blocked
 *
 * Returns: 302 redirect on success, 400 JSON on validation failure.
 * Tracking errors never block the redirect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// Exact hostname allowlist — no subdomains accepted
const ALLOWED_HOSTS = new Set([
  'extraspace.com',
  'clutter.com',
  'theguarantee.com',
  'theguarantors.com',
  'rhino.com',
  'leaselock.com',
  'storagelock.com',
]);

// Private/internal IP ranges and reserved hostnames to block
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,   // link-local
  /^::1$/,         // IPv6 loopback
  /^fc[0-9a-f]{2}:/i, // IPv6 unique local
  /^fe[89ab][0-9a-f]:/i, // IPv6 link-local
];

function isInternalHost(hostname: string): boolean {
  return BLOCKED_HOSTNAME_PATTERNS.some((pat) => pat.test(hostname));
}

const INVALID_REDIRECT = NextResponse.json(
  { error: 'Invalid redirect target' },
  { status: 400 },
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const partner    = (searchParams.get('partner') ?? '').trim();
  const target_url = (searchParams.get('target_url') ?? '').trim();
  const source     = (searchParams.get('source') ?? '').trim() || null;

  // Validate partner
  if (!partner) {
    return NextResponse.json({ error: 'Missing partner' }, { status: 400 });
  }

  // Enforce https:// — no http, no data:, no javascript:, etc.
  if (!target_url.startsWith('https://')) {
    return INVALID_REDIRECT;
  }

  // Parse and validate URL structure
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(target_url);
  } catch {
    return INVALID_REDIRECT;
  }

  // Double-check protocol after parsing (paranoia: URL constructor normalises)
  if (parsedUrl.protocol !== 'https:') {
    return INVALID_REDIRECT;
  }

  const { hostname } = parsedUrl;

  // Block internal/private addresses regardless of allowlist
  if (isInternalHost(hostname)) {
    return INVALID_REDIRECT;
  }

  // Exact hostname match — subdomains (e.g. evil.extraspace.com) are NOT allowed
  if (!ALLOWED_HOSTS.has(hostname)) {
    return INVALID_REDIRECT;
  }

  // Attempt silent auth — failure never blocks the redirect
  let user_id: string | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {}, // read-only — we don't need to write cookies on a redirect
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    user_id = data.user?.id ?? null;
  } catch (err) {
    console.warn('[Track] Auth read failed (non-blocking):', err);
  }

  // Insert click record — use anon key (respects RLS insert policy)
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error: dbError } = await supabase
      .from('affiliate_clicks')
      .insert({
        user_id,
        partner,
        target_url,
        source_page: source,
      });

    if (dbError) {
      console.error('[Track] DB insert error (non-blocking):', dbError.message);
    }
  } catch (err) {
    console.error('[Track] Unexpected DB error (non-blocking):', err);
  }

  // Always redirect — tracking failures must never break the user flow
  return NextResponse.redirect(target_url, { status: 302 });
}

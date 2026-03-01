/**
 * Supabase SSR client for Server Components, API Routes, and Middleware.
 * Reads/writes cookies from the Next.js request/response context.
 *
 * Usage in Server Components:
 *   import { createSupabaseServerClient } from '@/lib/supabase-server'
 *   import { cookies } from 'next/headers'
 *   const supabase = createSupabaseServerClient(await cookies())
 *
 * Usage in API Routes / Middleware: pass the request + response object.
 */

import { createServerClient } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import type { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** For Server Components — uses next/headers cookies (read-only after React 19 changes). */
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // Server Components cannot set cookies — no-op here
      setAll() {},
    },
  });
}

/** For API Routes — can both read and write cookies on request/response. */
export function createSupabaseRouteClient(
  req: NextRequest,
  res: NextResponse
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

/** For Middleware — mutates both request and response cookies. */
export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });
}

/** Service-role client for server-side writes (bypasses RLS). Webhook use only. */
export function createSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createServerClient(SUPABASE_URL, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false },
  });
}

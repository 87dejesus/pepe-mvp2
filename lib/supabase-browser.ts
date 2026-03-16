/**
 * Supabase browser client for Client Components.
 * Uses @supabase/ssr createBrowserClient which manages cookies automatically.
 * This replaces lib/supabase.ts for auth operations.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

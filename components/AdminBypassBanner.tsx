'use client';

/**
 * AdminBypassBanner
 *
 * Shows a dismissible admin banner on /storage and /low-credit when the
 * logged-in user is the owner. Checks via supabase.auth.getUser() — no
 * URL params, no localStorage bypass.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'luhciano.sj@gmail.com';

export default function AdminBypassBanner() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setDismissed(sessionStorage.getItem('heed_banner_dismissed') === 'true');
      }
    }).catch(() => {});
  }, []);

  if (!isAdmin || dismissed) return null;

  return (
    <div className="shrink-0 bg-[#00A651]/90 border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3">
      <p className="text-xs font-medium text-white/90 leading-tight">
        🔧 ADMIN MODE — Full access (Owner only)
      </p>
      <button
        onClick={() => {
          sessionStorage.setItem('heed_banner_dismissed', 'true');
          setDismissed(true);
        }}
        className="shrink-0 text-white/60 hover:text-white text-lg leading-none w-5 h-5 flex items-center justify-center"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

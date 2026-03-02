'use client';

/**
 * AdminBypassBanner
 *
 * Two jobs:
 *  1. On mount: if URL has ?admin=heed → write localStorage so the banner
 *     persists across page navigations (the cookie is set server-side in
 *     proxy.ts, so the gate is already open by the time this runs).
 *  2. If heed_admin_bypass is active → show a dismissible green banner.
 *
 * Dismissal is stored in sessionStorage so it resets on a new browser session
 * but stays hidden while navigating within the same tab.
 *
 * Usage: drop <AdminBypassBanner /> anywhere inside a page — no Suspense needed.
 */

import { useEffect, useState } from 'react';

export const ADMIN_BYPASS_KEY = 'heed_admin_bypass';

/** Convenience hook — returns true if the admin bypass is active. */
export function useAdminBypass(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(localStorage.getItem(ADMIN_BYPASS_KEY) === 'true');
  }, []);
  return active;
}

export default function AdminBypassBanner() {
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Activate from URL param (cookie already set by middleware)
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'heed') {
      localStorage.setItem(ADMIN_BYPASS_KEY, 'true');
    }

    const isActive = localStorage.getItem(ADMIN_BYPASS_KEY) === 'true';
    setActive(isActive);

    // Persist dismiss choice for the browser session only
    if (isActive) {
      setDismissed(sessionStorage.getItem('heed_banner_dismissed') === 'true');
    }
  }, []);

  if (!active || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem('heed_banner_dismissed', 'true');
    setDismissed(true);
  }

  return (
    <div className="shrink-0 bg-[#00A651] border-b-2 border-black px-4 py-2 flex items-center justify-between gap-3">
      <p className="text-sm font-bold text-white leading-tight">
        🔧 DEV MODE — Heed Admin Bypass Active (you have full access)
      </p>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-white/80 hover:text-white font-black text-xl leading-none w-6 h-6 flex items-center justify-center"
        aria-label="Dismiss admin banner"
      >
        ×
      </button>
    </div>
  );
}

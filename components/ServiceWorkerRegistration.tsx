'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const register = () =>
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] registered', reg.scope);
          reg.addEventListener('updatefound', () => console.log('[SW] update found'));
        })
        .catch((err) => console.warn('[SW] registration failed', err));

    // Defer to window load — avoids competing with critical resources on iOS Safari
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}

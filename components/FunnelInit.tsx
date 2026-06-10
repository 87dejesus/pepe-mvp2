'use client';

import { useEffect } from 'react';
import { captureUtm } from '@/lib/funnel';

/**
 * Captures first-touch UTM params on landing so attribution survives the
 * multi-page funnel. Mounted once in the root layout. Renders nothing.
 */
export default function FunnelInit() {
  useEffect(() => {
    captureUtm();
  }, []);
  return null;
}

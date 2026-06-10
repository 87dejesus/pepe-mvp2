// Server component — must NOT be 'use client' so that dynamic = 'force-dynamic' is respected by Next.js/Vercel.
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import AuthCallbackContent from './AuthCallbackContent';

const Spinner = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A2540]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-[#00A651] rounded-full animate-spin" />
  </div>
);

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

/**
 * /decision — Server Component
 *
 * Synchronous. Reads ?admin=heed from searchParams and passes forceFullAccess
 * to DecisionClient as a plain prop. No DB, no Stripe, no async calls —
 * nothing can redirect before DecisionClient receives the prop.
 */

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import DecisionClient from './DecisionClient';

export default function DecisionPage({
  searchParams,
}: {
  searchParams: { admin?: string };
}) {
  const isAdminBypass = searchParams?.admin === 'heed';

  return (
    <Suspense>
      <DecisionClient forceFullAccess={isAdminBypass} />
    </Suspense>
  );
}

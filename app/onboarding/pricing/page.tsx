import { redirect } from 'next/navigation';

// Retired. The /paywall is the single source of truth for pricing and checkout
// (one-time $9.49, no trial). This route used to be a duplicate pricing screen
// with stale trial copy; anyone landing here now goes straight to the paywall.
export default function RetiredPricingPage() {
  redirect('/paywall');
}

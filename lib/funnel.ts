/**
 * Client-side funnel + attribution tracking.
 *
 * captureUtm() runs on first landing (root layout, via FunnelInit) and stores
 * first-touch UTM params in localStorage so attribution survives the
 * multi-page flow. The utm params drop off the URL after the landing page, so
 * we must capture them at entry, not at the conversion step.
 *
 * trackFunnel(event) fires a fire-and-forget POST to /api/track/event with the
 * stored attribution. It never throws: tracking must never break the flow.
 */

const UTM_KEY = 'steady_attribution_v1';

export type FunnelEvent =
  | 'quiz_start'
  | 'quiz_complete'
  | 'paywall_view'
  // Post-paywall sign-in instrumentation (free model). These replace the dead
  // Stripe funnel (checkout_start/paid) as the real signal past paywall_view:
  | 'signup_started'   // email submitted on /paywall
  | 'otp_sent'         // signInWithOtp succeeded, code step shown
  | 'otp_submitted'    // 6-digit code submitted for verification
  | 'otp_error'        // send or verify failed (round-trip broke)
  | 'access_granted'   // OTP verified, routed into /decision
  | 'checkout_start'
  | 'paid';

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

/** First-touch UTM capture. Idempotent: an existing attribution is never overwritten. */
export function captureUtm(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(UTM_KEY)) return; // first touch wins
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source');
    const medium = params.get('utm_medium');
    const campaign = params.get('utm_campaign');
    if (!source && !medium && !campaign) return;
    const attribution: Attribution = {};
    if (source) attribution.utm_source = source.slice(0, 100);
    if (medium) attribution.utm_medium = medium.slice(0, 100);
    if (campaign) attribution.utm_campaign = campaign.slice(0, 100);
    localStorage.setItem(UTM_KEY, JSON.stringify(attribution));
  } catch {
    // ignore malformed storage or blocked access
  }
}

function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

/** Fire-and-forget funnel event. keepalive lets it survive a redirect (e.g. to Stripe). */
export function trackFunnel(event: FunnelEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      event,
      ...getAttribution(),
      path: window.location.pathname,
    });
    fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never break the flow on a tracking failure
  }
}

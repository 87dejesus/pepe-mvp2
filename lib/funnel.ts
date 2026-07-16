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

// Referrer hosts we can classify when no UTM params are present. Search
// engines are "organic"; anything else external is "referral". Without this
// fallback, ALL organic search traffic (the whole point of the SEO content)
// reached the funnel with no source at all.
const SEARCH_HOSTS: Record<string, string> = {
  google: 'google',
  bing: 'bing',
  duckduckgo: 'duckduckgo',
  yahoo: 'yahoo',
  ecosia: 'ecosia',
  perplexity: 'perplexity',
};

function attributionFromReferrer(): Attribution | null {
  const ref = document.referrer;
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (!host || host === window.location.hostname) return null; // internal nav
    const engine = Object.keys(SEARCH_HOSTS).find((k) => host === `${k}.com` || host.endsWith(`.${k}.com`));
    // utm_campaign records the LANDING PATH, so organic attribution also tells
    // us which article was the entry door (e.g. "/blog/who-pays-broker-fee...").
    const landing = window.location.pathname.slice(0, 100);
    if (engine) {
      return { utm_source: SEARCH_HOSTS[engine], utm_medium: 'organic', utm_campaign: landing };
    }
    return { utm_source: host.replace(/^www\./, '').slice(0, 100), utm_medium: 'referral', utm_campaign: landing };
  } catch {
    return null;
  }
}

/** First-touch UTM capture. Idempotent: an existing attribution is never overwritten. */
export function captureUtm(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(UTM_KEY)) return; // first touch wins
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source');
    const medium = params.get('utm_medium');
    const campaign = params.get('utm_campaign');
    if (!source && !medium && !campaign) {
      // No explicit UTM: fall back to referrer classification (organic search
      // and external referrals). Direct visits stay unattributed.
      const fallback = attributionFromReferrer();
      if (fallback) localStorage.setItem(UTM_KEY, JSON.stringify(fallback));
      return;
    }
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

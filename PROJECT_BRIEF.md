# PROJECT_BRIEF.md — The Steady One

**Revision:** 1
**Last updated:** 2026-05-19
**Canonical record:** Update this on every meaningful change. Bump the revision number.

---

## 1. Status

- **Product:** The Steady One — NYC apartment match and decision-clarity platform
- **Production URL:** https://thesteadyone.com
- **Repo:** https://github.com/87dejesus/pepe-mvp2
- **Stage:** MVP shipped, first paid signup recorded 2026-05-19
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Supabase (auth + DB), Stripe (one-time payment), Vercel, Apify, Resend, Sentry
- **Mascot:** Heed the crocodile (never say "Pepe")

## 2. Billing model

- **Mode:** Stripe `payment` (NEVER `subscription` — see CLAUDE.md)
- **Price:** $9.49 / 30 days
- **Price ID:** `price_1TELqs08QwenlVoW1ECZCj4s`
- **Customer creation:** `always` on checkout so the billing portal works for one-time buyers
- **Webhook:** signature verified before business logic at `app/api/webhooks/stripe/route.ts`

## 3. User flow

```
/ (Hero video + CTA)
  └─ /flow (7-question quiz, answers in localStorage)
      └─ /paywall (OTP signin + checkout)
          └─ /subscribe (post-checkout activation poll)
              └─ /decision (listings, filtered + scored)
                  ├─ /exit (back out)
                  ├─ /storage (affiliate offers)
                  └─ /low-credit (guarantor partners)
```

Admin (`luhciano.sj@gmail.com`) bypasses paywall via `supabase.auth.getUser()` check, also via `?admin=heed` query.

## 4. Data sources

- **Primary scraper:** Apify `epctex~apartments-scraper-api` (Zillow data, cron 6:00 UTC sync + 6:10 UTC collect)
- **Secondary scraper:** RentHop API (Phase 1, cron 6:20 UTC, MN/BK/BX/QN, ~10 listings per borough)
  - Requires `RENTHOP_PROXY_URL` since Cloudflare blocks Vercel's AWS IPs
- **Table:** `listings` (NOT `pepe_listings`)
- **Sort order on /decision:** bedroom match → RentHop priority (real photos) → match score
- **Match score:** Borough 40 + Budget 30 + Bedrooms 20 + Pets 5 + Bath 3 + Incentive 2
- **Stale cleanup:** `app/api/cron/cleanup/route.ts` marks listings older than 10 days as `Expired`

## 5. Design system (Steady Modern)

Apply on every UI change without being asked.

**Identity:** NYC newspaper sophistication. Dark navy backgrounds, white text, calm editorial feel.

**Dark tokens (default):**
- bg: `#0A2540` deep navy, deeper `#071b30`
- text: white, white/70, white/50
- accent (CTA + progress): `#00A651` green
- card surface (on dark): `bg-white/[0.07] border border-white/20 rounded-2xl`
- listing card (white on dark): `bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.28)]`

**Light tokens (paywall/storage/low-credit inner content only):**
- bg: `#F8F6F3`, text `#1A1A1A`/`#666666`

**Never:**
- Gradient backgrounds
- Neobrutalist borders (`border-2 border-black`, hard offset shadows)
- Aggressive badges ("ACT NOW", "HOT")
- Red/orange/yellow CTAs
- Geist font (use Inter)
- White or beige as main page bg (dark only for main flow)

## 6. Open issues

- [ ] **Cron auth on apify/renthop sync routes:** no `CRON_SECRET` check exists, only the cleanup route is protected. Vercel cron header (`x-vercel-cron`) is not verified either.
- [ ] **CI:** no GitHub Actions workflow for lint/typecheck/build/smoke
- [ ] **Pre-commit hooks:** none configured (no Husky)
- [ ] **Footer:** no footer component anywhere; only the Header is shared
- [ ] **Per-page metadata:** /paywall, /subscribe, /onboarding/* still inherit only from root layout
- [ ] **Em-dashes in comments/console.log:** still present in src/; only user-visible copy was cleaned in revision 1
- [ ] **`app/test/page.tsx`:** harmless but exists in production (noindexed and disallowed in robots)

## 7. Standing copy rules

- **Voice:** builder-to-builder, no hype, no apology theater
- **No em-dashes or en-dashes** in user-visible strings (U+2014, U+2013). Use commas, colons, periods, or ASCII hyphens
- **No fake commitments:** no SLAs, no "we'll get back in 24h", no money-back promises unless founder explicitly approves
- **No fake scarcity:** no "ACT NOW" badges, countdown timers, or fabricated low-availability counts

## 8. Operational watch

- **Logs:** Vercel + Sentry. Webhook events logged with `[Webhook:<event>]` prefix
- **Cleanup cron:** monitor stale listings drop count in cron output
- **Stripe events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- **Stripe webhook URL:** `https://www.thesteadyone.com/api/webhooks/stripe` (LIVE mode)

## 9. Env vars required (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY              (sk_live_*)
STRIPE_WEBHOOK_SECRET
APIFY_TOKEN
APIFY_DATASET_ID
APIFY_ACTOR_ID                 (optional override)
RENTHOP_PROXY_URL              (scraping proxy — Cloudflare blocks Vercel AWS IPs)
CRON_SECRET                    (timing-safe-verified on cleanup route)
```

## 10. Page structure

| Route | Server/Client | Purpose | Metadata |
|---|---|---|---|
| `/` | Server | Hero video + CTA | Root layout |
| `/flow` | Client | 7-step quiz | `app/flow/layout.tsx` |
| `/paywall` | Client | OTP signin + checkout entry | Root layout |
| `/subscribe` | Client | Post-checkout activation poll | Root layout |
| `/decision` | Client | Listings browser, filtered + scored | Root layout |
| `/exit` | Client | Goodbye / re-engagement | Root layout |
| `/storage` | Server | Affiliate storage partners | Inline metadata |
| `/low-credit` | Server | Guarantor partners | Inline metadata |
| `/blog` | Client | Post index | `app/blog/layout.tsx` |
| `/blog/[slug]` | Server | Post detail | `generateMetadata` |
| `/signin` | Client | OTP signin standalone | `app/signin/layout.tsx` |
| `/onboarding/*` | Mixed | Post-auth onboarding | Root layout |
| `/test` | Server | Placeholder, noindexed | Inline noindex |
| `/not-found` | Server | Branded 404 | Inline noindex |
| `/api/*` | API routes | Backend (sitemap-disallowed) | n/a |

## 11. Communication rules

- Founder has no technical background. Step-by-step instructions with screenshots when possible.
- Direct and objective. Zero fluff.
- Prompts to Claude Code in English, complete in one shot.
- "Don't say anything yet" → respond only with the thumbs-up emoji.
- Never assume info, always confirm with the user.

## 12. Memory

- This file is canonical. Other context lives in `CLAUDE.md` (rules) and `~/.claude/projects/.../memory/MEMORY.md` (architecture, design system, patterns).
- Old discovery reports archived in `docs/archive/`.

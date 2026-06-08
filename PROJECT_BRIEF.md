# PROJECT_BRIEF.md — The Steady One

**Revision:** 4
**Last updated:** 2026-06-08 (scraper migration to saswave — bundled proxy)
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

- **Primary scraper (CURRENT):** Apify `saswave~advanced-apartments-com-scraper` (Apartments.com). Adopted 2026-06-08. **Bundles its own proxy infra** (no `proxyConfiguration` input) — the critical property. apartments.com aggressively blocks datacenter proxies; our Apify STARTER plan has zero residential proxy, so any actor that uses OUR proxy (ParseForge, powerai) gets blocked at volume. saswave handles anti-bot itself: a single run pulled 40 listings, 95% with numeric rent, 100% with public `images1.apartments.com` images, full address+ZIP. Replaces ParseForge, epctex, and RentHop.
  - Route: `/api/apify/sync` (start run, `search_url=apartments.com/new-york-ny/`, `max_pages=5` ≈ 200 listings) → `/api/apify/collect` (poll + upsert). Normalizer: `lib/saswave-normalize.ts`.
  - **Cron: every 3 days** (06:00 sync, 06:25 collect UTC). Pricing ~$0.001/result ≈ **$2/month** at 200 every 3 days. Tune volume via `SASWAVE_MAX_PAGES` env (default 5) or cron frequency in `vercel.json`.
  - Schema is nested: `pricingAndFloorPlans[].rent_label` ("$1,950 - $2,300", take min numeric), `about.location` (address + ZIP), `about.image` (CDN url). Borough from ZIP prefix (rejects non-NYC bleed).
- **Retired:** `parseforge~apartments-com-scraper` (great data but used OUR proxy → apartments.com blocked it at volume, 2026-06-08); `epctex~apartments-scraper-api` (stopped returning `rent` mid-May 2026); RentHop + ScraperAPI proxy (too expensive). Their routes/normalizers remain in the repo unused — safe to delete later. **Do NOT pick an apartments.com actor that exposes a `proxyConfiguration` input unless we buy residential proxies — it will get blocked.**
- **Table:** `listings` (NOT `pepe_listings`)
  - `listings_price_check` constraint allows `price >= 0` (price == 0 still means "Contact for pricing" for buildings without a published rent).
- **Sort order on /decision:** bedroom match → RentHop priority (legacy, now inert) → match score
- **Match score:** Borough 40 + Budget 30 + Bedrooms 20 + Pets 5 + Bath 3 + Incentive 2
  - Listings with `price == 0` get 15/30 budget points (neutral) and bypass both strict and relaxed budget caps
- **Stale cleanup:** `app/api/cron/cleanup/route.ts` marks listings older than 10 days as `Expired`. **Important:** if the scraper fails for >10 days the DB drains and the site falls back to 10 hardcoded mock listings in `app/decision/DecisionClient.tsx` (`streeteasy.com/mock-N` URLs that 404). Add monitoring on `synced: 0`.

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

### High priority (next session)
- [ ] **Evaluate `parseforge/apartments-com-scraper`** via the `/scraper-provider-evaluator` skill. Current Apify actor (`epctex/apartments-scraper-api`) regressed on 2026-05-19 — no longer returns the `rent` field. Quick fix in PR #7 patches around it with "Contact for pricing" but the proper fix is a replacement actor.
- [ ] **Decide on ScraperAPI plan** before mid-June 2026. Free tier (1000 credits/month) burns out in ~20 days at current daily RentHop sync rate. Options: upgrade to Hobby (~$49/mo, 100k credits), reduce cron from daily to weekly, or reduce borough coverage.
- [ ] **Rotate the ScraperAPI API key** that was leaked in chat (`30e0384ce6a3acd0d3fb0181dd651e2b`). Login at dashboard.scraperapi.com → Manage → regenerate → update `RENTHOP_PROXY_URL` in Vercel and redeploy.

### Medium priority
- [ ] **Cron auth on apify/renthop sync routes:** no `CRON_SECRET` check exists, only the cleanup route is protected. Vercel cron header (`x-vercel-cron`) is not verified either.
- [ ] **Monitoring for empty scraper runs:** the 2026-05-19 incident persisted because nothing alerted when `synced: 0` happened day after day. Add a Sentry alert or a health endpoint.

### Low priority
- [ ] **CI:** no GitHub Actions workflow for lint/typecheck/build/smoke
- [ ] **Pre-commit hooks:** none configured (no Husky)
- [ ] **Footer:** no footer component anywhere; only the Header is shared
- [ ] **Per-page metadata:** /paywall, /subscribe, /onboarding/* still inherit only from root layout
- [ ] **Em-dashes in comments/console.log:** still present in src/; only user-visible copy was cleaned in revision 1
- [ ] **`app/test/page.tsx`:** harmless but exists in production (noindexed and disallowed in robots)
- [ ] **`maxItems: 300` hardcoded** in `app/api/apify/sync/route.ts` violates CLAUDE.md "always use maxItems ≤ 3 for tests". Route doesn't accept a query param so manual test runs cost full credits.

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

## 13. Incident log

### 2026-05-19 — Scraper double failure (resolved same day)

**Symptoms:** First paid subscriber reported that listing detail links went to `streeteasy.com/mock-N` 404 pages. Investigation showed `/decision` was serving the 10 hardcoded fallback mocks because the DB had zero active listings.

**Root causes (two independent bugs that surfaced together):**
1. **Apify actor regression** — `epctex/apartments-scraper-api` stopped returning the `rent` field on its items. Our `normalizeItem` rejected 100% of 300 items per run via the `price <= 0 → return null` guard. Daily cron had been silently writing 0 listings for ~10 days; cleanup cron then marked all existing listings `Expired`.
2. **RentHop proxy unauthorized** — ScraperAPI account (`luhciano.sj@gmail.com`) had never been activated. The proxy was returning plain-text `"Unauthorized"` on every request, breaking JSON parse in the search step. Activation generated a new API key, but `RENTHOP_PROXY_URL` in Vercel still held the old (invalid) one.

**Fixes shipped:**
- **PR #7** (`fix(scraper): accept listings without price...`) — normalizer keeps `price == 0` items, card renders "Contact for pricing", match score and budget filters handle zero gracefully.
- **Supabase SQL** — `ALTER TABLE listings DROP CONSTRAINT listings_price_check; ALTER TABLE listings ADD CONSTRAINT listings_price_check CHECK (price >= 0);`
- **Vercel env var** — `RENTHOP_PROXY_URL` updated with the new ScraperAPI key, redeployed.

**End state:** 132 Apify listings ("Contact for pricing") + 20 RentHop listings (with photos and prices) upserted. Site recovered.

**Open follow-ups:** see §6 high-priority list.

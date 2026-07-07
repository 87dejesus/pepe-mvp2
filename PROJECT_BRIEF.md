# PROJECT_BRIEF.md — The Steady One

**Revision:** 11
**Last updated:** 2026-07-07 (Reddit session 5: more thesis/scam posts mined; RPL §226-b assign-vs-sublet + full FARE trio added to copy bank)
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

- **CURRENT (2026-06-16): FREE.** The $9.49 paywall is retired for the 90-day distribution test. Access is granted to any authenticated (email-verified) user via the `FREE_ACCESS` flag in `app/api/auth/access-status/route.ts`. The whole funnel opens after free email sign-in (OTP code), not payment. To restore the paywall, flip `FREE_ACCESS` to false. Decision recorded in memory `business-model-90day-test.md`.
- **Stripe (dormant, intact — do NOT delete):** Mode `payment` (NEVER `subscription`). Price $9.49 / 30 days, ID `price_1TELqs08QwenlVoW1ECZCj4s`. Webhook signature-verified at `app/api/webhooks/stripe/route.ts`. All Stripe code, the webhook, `subscription_status`, and `/subscribe` remain in place but unused while free.
- **Monetization plan:** affiliate referrals (free + affiliate model). Applied 2026-06-15, in review: Lemonade (renters insurance, Impact network) and Self (credit-builder, FlexOffers). Rhino/LeaseLock/TheGuarantors have NO affiliate program — see memory `affiliate-partners-status.md`.

## 3. User flow

```
/ (Hero + CTA)
  └─ /flow (7-question quiz, answers in localStorage)
      └─ /onboarding/tradeoffs (education)
          └─ /onboarding/preview (1 free sample match + honest read)
              └─ /paywall (FREE email sign-in: OTP code, NO charge)
                  └─ /onboarding/post-auth (access router → /decision)
                      └─ /decision (listings, filtered + scored)
                          ├─ /exit (back out)
                          ├─ /storage (affiliate offers)
                          └─ /low-credit (guarantor partners)
```

`/subscribe` (re-payment) and the Stripe checkout branch of `/onboarding/post-auth` are dormant under the free model. Admin (`luhciano.sj@gmail.com`) bypasses straight to `/decision`. To test the real free flow, use a NON-admin email.

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
- [ ] **Distribution / Reddit (founder):** traffic is ~zero (~14 funnel events, mostly tests). This is THE bottleneck, not the product. Warm up the `takeitslow` account via the `reddit-comment-drafter` skill: helpful comments, ZERO links for the first ~2 weeks. When links do go out, UTM-tag them (`?utm_source=reddit`) so funnel attribution works.
  - Profile assets live (2026-06-17): branded banner (`public/brand/reddit-banner.png`, centered editorial copy, no mascot) + Heed avatar (`public/brand/reddit-avatar.png`). Profile link UTM-tagged (`utm_source=reddit&utm_medium=profile`). Warm-up comments (no links) still pending.
  - **Warm-up active — first traffic (2026-06-17): 6 site visits** from comments alone (NO links yet; people clicking through the profile). First real signal that the strategy works; traffic was ~zero before.
  - **Reddit insights workspace live** (`docs/reddit-insights/`): `copy-bank.md` (verbatim renter phrases mined from threads, organized by the 8 Heed pains, with copy angles) + `raw/` captures + `README.md` (flow). **Working rules this session:** Claude writes the comment replies directly (NOT the `steady-one-reddit-drafter` agent, to save tokens — ~2k/reply); always mine good phrases into the bank, even on lukewarm posts; avoid AI tells incl. NOT ending every reply with a question (memory `reddit-replies-avoid-ai-tells.md`). ~10 threads engaged across r/NYCapartments + r/AskNYC. Standout finds: a real scammer script ($500 "good faith deposit" to hold + the victim's rationalizations + the legit-vs-scam nuance) = ready-made anti-scam content; and broker Suzfindsnyapts (u/Suzfindsnyapts, "I save people from scammers", blog) publicly stated The Steady One's exact thesis ("the hardest part is factoring tradeoffs... finding your balance is the challenge") — treat as a **potential ally / credibility source, NOT a customer; pure rapport, never pitch**.
  - **Session 2 (2026-06-17, continued):** copy bank grown to ~30 mined phrases across all 8 pains. Two highest-value content angles now documented: (1) **FARE Act** — VERIFIED via DCWP/NYC.gov: since 2025-06-11 a landlord/landlord's-agent cannot charge a tenant a broker fee (fines $750–$2,000, report via 311/DCWP); copy can flatly say "a broker fee on a landlord-listed unit is illegal now." (2) the **scam case study** (full script + rationalizations + legit-vs-scam nuance per Left-ulna: deposit is fine only AFTER viewing + receipt + signed agreement + verified license). (3) flagship **decision-clarity case** — "A Choice Between Two Apartments" post: 25-item pro/con list where the buried non-negotiable (natural light, "desperate") was in line 1; perfect example of "lists don't decide, separating non-negotiable from nice-to-have does." **Ally rapport landed:** Suzfindsnyapts replied to Heed's comment and agreed ("yoga teacher, not salesperson" — candidate tagline, banked as most on-brand find). Reminder of working rule: don't end every reply with a question; watch the "honestly" tic.
  - **Session 3 (2026-06-17):** more threads engaged (r/NYCapartments + r/AskNYC). Discovery: **tenant-rights / policy posts are the strongest vein** — verified facts most people don't know, no opinion needed. Built a verified content arsenal (all with official sources in `copy-bank.md`): (1) **FARE Act** + the broker workaround (signing "Exclusive Right to Represent"/commission to make YOU the hirer); (2) **Rent Freeze 2026** — RGB voted 7-1 on 2026-06-25, 0% for BOTH 1- and 2-yr stabilized leases commencing Oct 1 2026–Sep 30 2027 (first-ever 2-yr freeze; Mamdani pledge) → angle: 2-yr no longer costs more, lock it; (3) **Good Cause Eviction** (NYC since 2024-04-20; caps increase at lower of 10% or CPI+5 ≈8.79%; small-landlord exemption = ≤10 units statewide); (4) **Warranty of Habitability** (RPL §235-b runs full lease term, non-renewal irrelevant; lever = 311→HPD, escalate to AG James office for speed). Copy bank now ~40 entries. **First brand link is LIVE (2026-06-17):** the sanctioned **self-promo post** went up in r/NYCapartments' monthly self-promo thread (links allowed there), UTM-tagged `utm_source=reddit&utm_medium=selfpromo&utm_campaign=monthly_thread`, copy follows no-business-model rule. Watch funnel for attribution. **Workflow note:** founder posts everything Claude drafts (comments AND links) — no need to confirm post status going forward.
  - **Session 4 (2026-06-17):** the Good Cause reply landed **37 upvotes / 1158 views** — confirms tenant-rights verified-fact content is the strongest vein and is building account credibility. Verified two more Good Cause facts (RPL §231-c): landlord must annex a disclosure to every lease/renewal stating if Good Cause applies + the exemption basis; and if claiming the small-landlord exemption, must disclose other buildings owned (+ LLC owners/unit counts) — tenant can demand it in writing. Mined the "dealbreakers" + "hardest part" discussion threads heavily — these are the richest thesis material (e.g. natural light = one person's HARD NO, another's don't-care → "the others' list isn't yours"; "decide your hard lines before you tour, not in the apartment you already love"). Copy bank now ~45 entries with strong copy angles flagged. **Strategy:** prioritize replying to **top-1%/high-karma commenters** (Suzfindsnyapts, YourHuckleberry32__) — highest-leverage for profile visits + organic advocacy; win them via consistency as the accurate non-salesy voice, never pitch (logged in `docs/reddit-insights/README.md`).
  - **Session 5 (2026-07-07):** more flagship thesis posts mined — the emotional core now well-documented: the desperation → FOMO → paid-a-deposit-sight-unseen → regret pipeline ("the adrenaline of sending the deposit wore off"; "in hindsight, too quickly"). Added the full **FARE Act trio** (illegal landlord-broker fee / the Exclusive-Right-to-Represent workaround / the "did I even hire them?" gray zone) and **RPL §226-b assign-vs-sublet** (assignment can be refused but triggers a 30-day release; sublet in 4+ unit buildings can't be unreasonably refused, silence 30 days = consent) — both VERIFIED with official sources. Tenant-rights arsenal in `copy-bank.md` now covers FARE, Rent Freeze, Good Cause, Habitability, and Assign/Sublet. Copy bank ~50 entries.
  - **In-scope subs ranked:** r/NYCapartments + r/AskNYC (high), r/brooklyn + r/astoria (med), r/nyc + r/manhattan (only clear pain/decision posts). Skip r/movingtoNYC, r/personalfinance, r/legaladvice, and any "Looking For Apartment"-flair listing requests.
- [ ] **Swap dead `/low-credit` partners** for Lemonade + Self once their affiliate programs approve. Rhino/LeaseLock/TheGuarantors pay nothing.
- [ ] **Resend follow-up email:** not built. Until it is, do NOT promise "new matches by email" in copy.
- [x] **Kill metric (decided 2026-07-03):** by 2026-09-14, ≥300 UTM-tracked visits (cumulative) AND ≥30 captured emails. Hit → double down on the winning UTM source. Miss → pause the current approach and rethink the funnel top (keep only Reddit + SEO).
- [ ] **On-camera video test (founder decision 2026-07-03, supersedes the "faceless" lock):** founder records 3 short videos with his face on Sat 2026-07-04. Scripts: `marketing/video-scripts-2026-07-04.md`. Post spread over the following week; bio links UTM-tagged (`utm_source=tiktok|instagram|youtube&utm_medium=bio&utm_campaign=face_test`). Evaluate after 2 weeks against Reddit traffic in `funnel_events`; video earns a routine slot only if it outperforms.
- [ ] **Rotate the leaked ScraperAPI key** (`30e0384...`) if not already revoked. RentHop/ScraperAPI are retired so it is likely unused, but revoke it anyway.

### Done since revision 4
- [x] **OTP email delivery verified** (2026-06-17): Supabase Auth custom SMTP is ON via Resend (`smtp.resend.com`, sender noreply@contact.thesteadyone.com); end-to-end test delivered the code to the inbox. The free funnel's email gate is volume-safe.
- [x] **Cron auth on Apify sync/collect routes** (2026-06-16): both require `CRON_SECRET` via `lib/cron-auth.ts`, matching cleanup + watchdog.
- [x] **Empty-scraper monitoring** (PR #27): `app/api/cron/watchdog/route.ts` raises a Sentry alert when listings go low/stale.
- [x] **Funnel tracking** (PR #30): `funnel_events` table + first-touch UTM (`lib/funnel.ts`). Works, but real traffic is ~zero.

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
- **Never expose the revenue model** in user-facing copy (no "we earn from partners", no commission/affiliate mechanics). A CTA footer kills click friction with UX facts only (free, no card, no account). See memory `copy-no-business-model-exposure.md`.

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

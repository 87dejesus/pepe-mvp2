---
name: steady-one-design
description: The Steady One's visual design language. Use whenever creating or editing ANY user-facing UI for this project (pages, components, copy layout, mockups) so every surface carries the core identity. Triggers on any visual/layout/styling work in app/ or components/, any redesign or "repaint" request, any new page or component, or building UI mockups.
---

# The Steady One — Design Language

Apply this to every UI change without being asked. The canonical reference implementation is `components/DecisionListingCard.tsx`. The full rationale is `docs/DESIGN_IDENTITY.md`.

## North star

> The Steady One is a **decision desk**, not a listings browser. Every screen helps an NYC renter see the tradeoffs, hold their non-negotiables, and commit with a clear head.

If a screen looks like Zillow or a generic SaaS template, it is off-identity. Direction is **Dark Broadsheet**: a calm navy world with editorial serif headlines.

## Tokens

```
navy        #0A2540   the world / page background
navy-deep   #071b30   bottom nav, footers, deeper surfaces
green       #00A651   "go / meets your line" — primary CTA + progress + MET
green-dk    #00913f   CTA hover
clay        #C8814B   tension/tradeoff/CONFIRM signaling ONLY — never a CTA
miss-red    #d4504a   a non-negotiable NOT met (signaling only)
subway      #fccc0a   transit glyph (NYC subway yellow)
text        #fff / rgba(255,255,255,.7) / .5 / .45
line        rgba(255,255,255,.14)   hairline borders
card-surface  bg rgba(255,255,255,.04-.07), border 1px line, radius 12-20
```

## Typography

- **Headlines & verdicts:** serif, `var(--font-caslon)` (Libre Caslon Display, loaded in `app/layout.tsx`). This is the "NYC newspaper" voice. Use for the one big statement per screen.
- **UI, body, labels, buttons:** `var(--font-inter)`. Default.
- **Section labels:** 11px, uppercase, letter-spacing .16em, `rgba(255,255,255,.45)`, weight 700.
- **Kickers:** 11px, uppercase, .16em, green.

## The three motifs (reuse these, they are the identity)

1. **Non-negotiables scorecard** — the user's quiz lines (budget, bedrooms, borough, pets) scored against the thing on screen: MET (green ✓) / CONFIRM (clay ?) / MISS (red ✕). Use a 2-col grid of small bordered chips. This makes the user feel their own criteria.
2. **Tradeoff ledger** — a two-column "You gain / You give up" block (green `+` / clay `–`). Always honest, never one-sided. This is the product's soul.
3. **Heed's take** — an editorial pull-quote in serif italic, green left-border, with the 🐊 avatar and an uppercase "Heed's take" byline. Heed is a voice that does a job, not a sticker.

Supporting NYC motif: **transit literacy** — real nearest subway line + walk time (subway-yellow glyph), the way a New Yorker actually evaluates a place. Data lives in the `transit` column (parsed in `lib/saswave-normalize.ts`).

## Verdict language

Match score drives the verdict stamp + editorial headline:
- `>= 80` → "Strong match" (green stamp)
- `>= 60` → "Worth a look"
- `< 60`  → "A stretch"

## Hard rules (never break)

- Dark navy is the world. No random light-mode pages (the old Exit/Storage light bg is a bug to fix, not a pattern).
- NO gradient backgrounds as decoration (a photo scrim gradient is fine).
- NO fake urgency, scarcity badges, countdowns, or "ACT NOW". The honesty is the brand.
- NO red/orange/yellow CTAs. Green is the only CTA color. Clay/red are signaling only.
- NO neobrutalism (hard offset shadows, `border-2 border-black`).
- Inter for UI; serif ONLY for headlines/verdicts/pull-quotes.
- Keep Heed the crocodile (🐊) as the guide. Never call the product or mascot "Pepe" in anything user-facing.
- Mobile-first: max content width ~430-480px, generous padding, tap targets >= 44px.

## Component recipes (values from the card)

- **Primary CTA:** `bg #00A651, text #fff, height 50-56, radius 12, weight 700`; hover `#00913f`; `active:scale(.98)`.
- **Secondary CTA:** `bg rgba(255,255,255,.06), border 1px line, text rgba(255,255,255,.78), radius 12`.
- **Verdict stamp:** pill, uppercase 11px/800, green when strong else navy-glass with hairline border.
- **Pull-quote (Heed):** `bg rgba(255,255,255,.05), border-left 3px green, radius 0 12 12 0`, serif italic body.
- **Section divider label:** centered or left uppercase label with hairline rules.

## Page application notes

- **Home:** editorial hero — the decision-desk promise as a serif headline, the tradeoffs/non-negotiables value prop as subhead, a 3-pillar hint, green CTA to /flow. NYC voice above the fold.
- **Flow (quiz):** frame answers as the user *drawing their non-negotiables* (a contract they sign), not a plain form.
- **Onboarding (esp. /tradeoffs):** core-identity territory; the whole funnel should feel like one editorial product.
- **Paywall:** editorial and honest — "keep your decision desk," no fake urgency.
- **Exit:** bring into the navy world; a calm editorial verdict ("wait thoughtfully").

## Process rule

Visual changes are **mockup-first**: produce a rendered HTML mockup (see `docs/mockups/`), get founder approval, then implement. Do not ship UI to production without an approved look.

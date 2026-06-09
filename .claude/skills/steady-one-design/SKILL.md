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
3. **Heed's take** — an editorial pull-quote in serif italic, green left-border, with Heed and an uppercase "Heed's take" byline. Heed is a voice that does a job, not a sticker.

Supporting NYC motif: **transit literacy** — real nearest subway line + walk time (subway-yellow glyph), the way a New Yorker actually evaluates a place. Data lives in the `transit` column (parsed in `lib/saswave-normalize.ts`).

## Heed — the mascot asset (do not substitute)

ALWAYS render the real Heed art at `public/brand/heed-mascot.png` (a green crocodile in a safari hat, coat, messenger bag, NY coffee cup). NEVER replace him with a 🐊 emoji or a generic crocodile. Show him **full-body** (object-fit: contain), not cropped inside a circle — his outfit is the character. Sizes: ~26-30px in a masthead, ~52-64px in a Heed voice strip. He may carry a small drop-shadow.

## NYC texture (the "engraving" layer)

The broadsheet identity wants NYC present visually, not just in copy. Use two subtle background layers behind hero/editorial areas:
- **Etched skyline** — line-art (stroke-only, fill none) NYC skyline as an SVG, white strokes at ~0.12-0.18 opacity, bottom-anchored behind the headline. Evokes a newspaper engraving. (See `docs/mockups/home-A-broadsheet.html` for a reference SVG.)
- **Halftone newsprint** — a faint dot texture via `radial-gradient(rgba(255,255,255,.05) .7px, transparent .7px); background-size: 4px 4px` at ~0.5 opacity. Evokes printed newsprint.

Keep both subtle so headlines stay legible (add a soft text-shadow on serif headlines over texture).

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

## Copy voice (founder, not AI)

All user-facing text is builder-to-builder, plain, and direct. Before shipping any copy, strip the AI tells:
- **No em-dashes or en-dashes** (U+2014 / U+2013) anywhere users see. Use commas, periods, colons, parentheses, or `·`.
- **No marketing polish / fluff words:** elevate, seamless, curated, nestled, boasts, unlock, dive in, in the heart of, effortless, vibrant, genuinely, truly.
- **No roadmap-speak in product copy** ("we'll add X soon"). Say what's true now, or give an action ("Ask the landlord, or check DHCR").
- **No hedged AI cadence:** prefer contractions (you're, it's), short sentences, and a real verb over "this is a quiet yes" / "worth it only if the gains matter more to you."
- **No fake urgency / scarcity** (already a hard rule): no "before it's gone" countdowns, no "X people viewing."
- **Don't overpromise what the data can't do.** If we can't filter on something (e.g., per-listing qualification or rent-stabilization), don't imply we will. Say the honest version ("you'll need a guarantor here, confirm with the building").

Read each line as if a skeptical NYC renter wrote it for a friend. If it sounds like a brochure or an LLM, rewrite it.

## Process rule

Visual changes are **mockup-first**: produce a rendered HTML mockup (see `docs/mockups/`), get founder approval, then implement. Do not ship UI to production without an approved look.

# The Steady One — Design Identity (Phase 0 draft for approval)

**Status:** DRAFT. This is the north star we agree on before any mockup or code.
**Date:** 2026-06-08

---

## North star (one line)

> The Steady One is not a place to browse apartments. It is a **decision desk** that helps an NYC renter see the tradeoffs and hold their non-negotiables, then commit with a clear head.

Everything visual should serve that sentence. If a screen looks like Zillow or a generic SaaS quiz, it is off-identity.

---

## The core shift: listing → decision

Today the app *lists* apartments. The redesign makes it *adjudicate* them. Every apartment is shown as a **choice with consequences**, not a spec sheet.

| Today (agregador) | Target (decision desk) |
|---|---|
| Photo + price + bullets + Apply | Photo + **verdict** + your non-negotiables checked + the tradeoff |
| Colored dots you skim past | "You gain X. You give up Y." in plain words |
| Quiz answers vanish after step 7 | Your non-negotiables follow you, visible on every card |
| "NYC" is a word in the copy | NYC is in the type, the borough, the transit, the restraint |

---

## Three identity pillars

### 1. Non-negotiables are a contract
The quiz is where the user signs their lines in the sand (budget, beds, borough, pets). The app must **reflect those lines back constantly** — a small persistent "your lines" strip — and on every decision card score the apartment against them: **MET / NOT MET**, unmistakable. The user should always feel *their own* criteria looking back at them.

### 2. Tradeoffs are made visible
No apartment is perfect. The card states the deal honestly: a short **gain / give-up ledger** ("$300 under budget, pet-friendly · but a 12-min subway walk, studio not 1BR"). This is the product's soul: helping someone *consciously* accept a tradeoff instead of panic-signing or endlessly scrolling.

### 3. NYC, expressed not stated
- **Borough as identity** — a borough is a strong, recognizable visual token, not gray subtext.
- **Transit literacy** — nearest line + walk time are first-class, the way a real New Yorker evaluates a place.
- **Restrained urgency** — the market moves fast, and we show that with editorial calm, never fake-scarcity badges (this is already a hard copy rule; the visuals must honor it).

---

## Visual language

**Keep:**
- Deep navy `#0A2540` as the world. The calm, editorial dark.
- Heed the crocodile as the guide/voice (not just a sticker).
- Green `#00A651` — but **reframed**: green means "go / meets your line," not "generic button."

**Evolve / add:**
- **Editorial headline type.** Introduce a serif display face for headlines and verdicts to deliver the "NYC newspaper sophistication" the brief always wanted. Keep Inter for UI and body. (This is a proposed change to the current Inter-only rule — calling it out, not doing it silently.)
- **A tension accent** for tradeoffs/give-ups: a muted clay/amber used for *signaling only* (never as a CTA — respects the no-red/orange-CTA rule).
- **One surface system.** Today main pages are dark navy but Exit, Storage, and Low-Credit drop to a light `#F8F6F3` with no clear reason. Decide one of: (a) everything lives in the navy world, or (b) light `#F8F6F3` becomes a deliberate "newsprint" surface used consistently for a named purpose. Right now it reads as accidental.
- **Heed as a voice treatment** — "Heed's verdict" / "Heed's take" gets a consistent, recognizable frame (an editorial pull-quote / stamp), so the character does a job instead of decorating.

---

## Page-by-page audit (current → what's missing)

- **Home (Hero):** Full-bleed video + green CTA. Competent but generic; could be any rental startup. Missing: a hint of the decision-desk promise and NYC editorial voice above the fold.
- **Flow (quiz):** Clean dark cards, Heed hint text, progress bar. Works, but it is a plain form. It never frames these answers as *non-negotiables* the user is committing to. Opportunity: make signing your lines feel meaningful.
- **Decision card (worst offender):** White card, image, price badge, colored-dot bullets, "Heed's Take," Apply/Wait. Reads as a generic listing tile. Missing all three pillars: no non-negotiable scorecard, no tradeoff ledger, no NYC/transit identity. This is where the redesign earns its keep.
- **Exit:** Light bg breaks the world; good message ("wait thoughtfully") but visually disconnected from the rest. Should feel like the same product delivering a calm verdict.
- **Paywall / Onboarding:** Functional, off-identity, inconsistent surfaces. Inherit the new language in Phase 2.

---

## What this is NOT

- Not a from-scratch rebrand. Navy + green + Heed stay.
- Not more features. Same flow, same data. We are giving the existing decision *a face*.
- Not fake urgency, ever. The honesty is the brand.

---

## Direction chosen (2026-06-08)

**Direction A — Dark Broadsheet.** Navy world (`#0A2540`) + editorial serif headlines (Libre Caslon Display) + Inter for UI. Premium, sober, cohesive with the existing site. Newsprint (Direction B) shelved. Mockups in `docs/mockups/decision-card-A-broadsheet.html` (chosen) and `-B-newsprint.html` (reference).

The decision card structure is locked as the template: photo + borough tag + verdict stamp / editorial verdict headline / price with under-ceiling delta / **non-negotiables scorecard** (MET / NOT MET / confirm) / **tradeoff ledger** (you gain / you give up) / transit line / Heed's pull-quote take / decision actions.

## Plan from here

- **Phase 1 (done):** identity + chosen decision-card direction (A).
- **Phase 1.5 (next):** reconcile the design with the data we actually have. The mockup shows a transit line ("R train · 8 min · ~35 min to Midtown") we do NOT yet have in the DB. Decide: omit, soft version, or source transit data. Everything else (verdict, non-negotiables, price delta, tradeoff ledger) is buildable from existing quiz answers + listing fields.
- **Phase 2:** implement the real `DecisionListingCard` in code, then codify the approved language into a `steady-one-design` skill + repaint Home, Flow, Exit, Paywall consistently with subagents, so the whole site finally carries the core: **tradeoffs, non-negotiables, NYC.**

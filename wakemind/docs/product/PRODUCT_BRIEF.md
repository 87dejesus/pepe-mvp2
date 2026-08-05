# Product Brief

**Canonical document.** When reality changes, this file changes first, and
everything contradicting it is wrong until updated.

- **Revision:** 1
- **Last updated:** 2026-08-05
- **Owner:** Founder

---

## Thesis

WakeMind is a **commitment device**, not an alarm clock.

Its job is to **interrupt an automatic behaviour before it completes** — the
unconscious dismissal of a morning alarm, executed by motor memory while the
prefrontal cortex is still offline.

The emotional promise is not "wake up earlier." It is **"help people trust
themselves again."** People do not pay for a louder noise. They pay for
confidence that tomorrow morning will be different.

## The problem, precisely stated

Three causes of snoozing, only one of which is ours:

1. **Biology** — sleep debt and chronotype misalignment. No app fixes this.
2. **Automaticity** — dismissal is an over-learned motor sequence executed
   without memory formation. **This is our target.**
3. **Avoidance** — snoozing to postpone the day, not consciousness. Ours to
   avoid making worse.

The felt event is not the snooze. It is the reckoning twenty minutes later:
*"I did it again. I skipped the gym again. I can't trust myself."* That emotion
belongs in marketing and never in the product (ADR-0009).

## Why every competitor decays

Alarmy, Wayk, math alarms, QR-code alarms, the clock across the room — all
apply a **fixed** obstacle. Fixed obstacles automatize. The habit does not
break; it lengthens to absorb them.

What resists automatization is **varied mapping**: the correct response cannot
be derived from the cue alone. Not difficulty. Not physical effort. This is the
one quadrant nobody occupies, and it is the entire basis of the product
(ADR-0007).

## The intervention

**Night — ~20 seconds, awake and competent.** The app surfaces tomorrow's first
commitment from the calendar and asks one question: *"What are you getting up
for?"* One tap accepts the calendar-derived default; the user may write their
own words or record five seconds of voice. The app states the deadline back.

**Morning — target ~8 seconds.** The alarm fires. The user sees today's
commitments, then must resolve the interruption: confirm the promise they
actually made, among plausible alternatives, using one fixed gesture. Which
answer is correct changes daily and cannot be guessed. Then one button: *I'm up.*

Design rationale for each element is in ADR-0007, ADR-0008 and ADR-0009. Nothing
here is decoration.

## Positioning — three layers, on purpose

| Layer | What it is | Why |
|---|---|---|
| **Keyword** | alarm clock | the only way anyone finds us in the App Store |
| **Category** | commitment device | what justifies the price |
| **Promise** | self-trust | what makes them stay and tell a friend |

## ICP

Primary: **adults 25–40 with ADHD.** The clinical literature describes our exact
problem in our exact terms — peak executive function demanded at the moment
those systems are offline. Zero explanation needed, communities are findable,
and they already pay for scaffolding.

Secondary: **meeting-dense knowledge workers with morning anxiety.**

Explicitly not: students (broke, and their problem is sleep debt), heavy
sleepers who want volume (Alarmy owns them), people with sparse calendars.

Full reasoning in `ICP.md`.

## MVP scope

**In:**
- Reliable alarm (AlarmKit, iOS 26+)
- Calendar read via EventKit (ADR-0004)
- Night step: promise capture, one tap to accept the default
- Morning: today's commitments + the interruption + *I'm up*
- Recommended wake time, computed simply
- Onboarding only where a permission or a promise requires it
- Telemetry per `analytics/MEASUREMENT_SPEC.md`

**Out:** see `NOT_BUILDING.md`. That list is binding.

## Scope decision, recorded

The morning **commitments list stays in the MVP.** The founder's position: it is
part of the hypothesis under test, and the night promise complements rather
than replaces it. Accepted.

Consequence, recorded honestly: the morning flow now contains two candidate
mechanisms — the list (recognition of the day) and the interruption
(varied-mapping resolution of the promise). A single-arm test cannot tell us
which one does the work. `HYPOTHESES.md` H3 handles this with a logged variant
so the two can be separated after the fact rather than debated.

## How we validate

Not paid acquisition. The founder documents the build publicly — one short-form
video per day, real stories, product evolving in the open. That produces the
cohort, the verbatim and the demand signal at once. See `content/BUILD_IN_PUBLIC.md`.

The measurement that decides everything is **H2: does the advantage survive
day 14?** Everyone wins week one. The graveyard is full of apps that never
checked week three.

## Success and failure, defined in advance

Kill criteria live in `analytics/MEASUREMENT_SPEC.md` §7 and were agreed before
any data existed. That timing is the only thing that makes them meaningful.

## Open questions

1. Does the AlarmKit lock-screen → app transition survive a real 6:30am?
   (SPIKE-001. Everything depends on it.)
2. Will night-step compliance hold above 60% in week 2?
3. Do sparse-calendar days actually get carried by the promise?

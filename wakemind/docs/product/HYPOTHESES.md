# Hypothesis register

Append-only. Every belief we intend to act on lives here with its test, its kill
condition, and its status. A hypothesis with no kill condition is an opinion.

**Status values:** `Open` · `Testing` · `Validated` · `Killed` · `Parked`

---

## H1 — Mechanism

> An alarm dismissal requiring **varied-mapping recognition of self-authored
> content** produces fewer snoozes and a shorter time-to-up than a plain
> dismissal.

- **Status:** Open
- **Measured by:** `snooze_count`, `time_to_up`, interruption vs. plain mornings
- **Right when:** interruption mornings show a clear snooze reduction by day 7
- **Killed when:** no reduction by day 7
- **Decision it changes:** whether the product exists

---

## H2 — Durability  ← the one that decides the company

> That advantage **persists past day 14**, where fixed-obstacle alarms decay.

- **Status:** Open
- **Measured by:** the day 1→21 slope of H1's effect, plus the automaticity
  detector (`analytics/MEASUREMENT_SPEC.md` §3)
- **Right when:** the day 8–21 advantage holds at ≥70% of the day 1–7 advantage
- **Killed when:** it decays below 30%. We have a novelty app.
- **Decision it changes:** whether this is a company or a moment

**Why this outranks H1:** every product in this category wins week one. Alarmy,
Wayk and the math alarms all work at first. The category's failure is uniformly
at week three, and nobody instruments for it.

---

## H3 — Which mechanism does the work?

> The interruption, not the commitments list, is what reduces snoozing.

- **Status:** Open
- **Context:** the founder chose to keep the morning commitments list in the MVP
  (recorded in `PRODUCT_BRIEF.md`). The morning flow therefore contains two
  candidate mechanisms. A single-arm test cannot separate them.
- **Cheapest resolution, no extra cohort:** log the morning `variant` on every
  `interruption_shown` — `list_only`, `interruption_only`, `both` — and assign
  it within-user alongside the existing 70/30 split. Costs one enum and a
  branch. Buys the ability to answer this instead of arguing about it.
- **Right when:** `both` and `interruption_only` outperform `list_only`
- **Killed when:** `list_only` performs equal to `both` — the interruption is
  ceremony and should be cut
- **Decision it changes:** what the product actually is

**If we skip this, we will not know why the product worked, and we will not know
what is safe to remove later.** Whether to run the third arm now or after H1 is
the founder's call; the instrumentation should exist either way.

---

## H4 — Night-step compliance

> Users will complete a 20-second evening promise often enough for the morning
> mechanism to have material to work with.

- **Status:** Open
- **Measured by:** `night_step_compliance` weekly
- **Right when:** ≥60% at week 2
- **Killed when:** <60% at week 2. The design depends on a habit users won't form.
- **Mitigation already specified:** default the promise from the calendar so the
  night step is one-tap confirmation, never a blank page. If skipped, the morning
  must degrade to something useful rather than nothing.

**Flagged as the most likely failure point in the whole design.** We are asking
for a second habit that must form *before* the first one can work.

---

## H5 — Inertia tax is bounded

> Recognition of self-authored content is cheap enough to perform under sleep
> inertia.

- **Status:** Open
- **Measured by:** median `interruption_cost`, `wrong_attempts`
- **Right when:** median resolve time lands in a 4–10s band and stays there
- **Killed when:** median >15s, or `wrong_attempts` rising alongside abandonment
- **Decision it changes:** the difficulty of the distractor set

---

## H6 — Sparse days survive

> The self-authored promise keeps the product meaningful on days with no
> calendar events.

- **Status:** Open
- **Why it matters:** this was the hardest structural objection to the original
  concept — an app that is a blank screen on weekends cannot hold a subscription
- **Measured by:** day-3 and day-15 qualitative; snooze behaviour on
  zero-commitment mornings
- **Killed when:** users report the app feels pointless on empty days

---

## H7 — Demonstrability

> "My alarm plays me my own voice from last night" is watchable and shareable.

- **Status:** Open
- **Measured by:** organic reach of the daily short-form video, comment sentiment
- **Right when:** at least one video in the first ten reaches meaningful organic
  distribution
- **Killed when:** ten videos, no traction. The business needs paid acquisition,
  which changes the economics before we've spent anything.

---

## Parked

| Hypothesis | Why parked |
|---|---|
| Users will pay $4.99/mo | Cannot test until H1/H2 answer. Pricing the cohort would filter it. |
| ADHD is the strongest wedge | Believed on evidence, untested. Recruitment for the first cohort will produce a first read. |
| Voice beats text for the promise | Real question, wrong time. Ship text + optional voice, look at `input_mode` afterwards. |

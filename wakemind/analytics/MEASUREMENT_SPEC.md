# WakeMind — Measurement Spec (v1)

**Purpose:** this MVP is a learning instrument. If the instrumentation is wrong, the app can work perfectly and still teach us nothing. This spec is platform-independent and should be settled before any UI is built.

**The hypothesis being measured:**

> **H1 (mechanism):** the interruption reduces snoozes and time-to-up vs. a plain dismissal.
> **H2 (durability):** that advantage **persists past day 14**.

H1 is the product. **H2 is the company.** Every metric below exists to produce the day-1→21 slope.

---

## 1. Event schema

Nine events. Nothing else in v1. Every event carries `user_id`, `local_timestamp`, `utc_timestamp`, `timezone`, `app_version`, `install_day_index` (0-based days since install).

| Event | When | Payload |
|---|---|---|
| `alarm_scheduled` | user sets/edits an alarm | `alarm_time_local`, `source` (manual \| calendar_derived) |
| `promise_written` | night-step completed | `char_count`, `input_mode` (typed \| voice \| calendar_default_accepted), `seconds_to_complete`, `is_edit_of_default` |
| `promise_skipped` | night-step dismissed or missed | `reason` (dismissed \| never_opened) |
| `alarm_fired` | siren starts | `alarm_id`, `scheduled_for`, `actual_fire_time`, `had_promise` (bool) |
| `interruption_shown` | the recognition screen renders | `alarm_id`, `ms_from_fire_to_render`, `variant` (see §3) |
| `interruption_resolved` | correct response given | `alarm_id`, `ms_from_render_to_resolve`, `wrong_attempts` (int) |
| `snooze_pressed` | any snooze | `alarm_id`, `snooze_index` (1st, 2nd…), `ms_from_fire` |
| `up_confirmed` | "I'm up" tapped | `alarm_id`, `ms_from_first_fire` |
| `morning_abandoned` | alarm killed without `up_confirmed` (force-quit, power-off, permission revoked, 30-min timeout) | `alarm_id`, `method` |

**Two rules that are easy to get wrong and expensive to fix later:**

1. **`ms_from_first_fire` anchors to the FIRST ring of the morning, never the last snooze.** Otherwise snoozing improves your metrics.
2. **`morning_abandoned` must fire.** An app that only logs successes will report 100% success. This event is where churn hides.

---

## 2. Derived metrics

Per user, per morning:

- **`snooze_count`** — number of `snooze_pressed` before `up_confirmed`
- **`time_to_up`** — `up_confirmed.ms_from_first_fire`, in minutes
- **`interruption_cost`** — `interruption_resolved.ms_from_render_to_resolve`. This is the sleep-inertia tax. If median exceeds ~15s, the recognition task is too heavy and we're back in the trilemma.
- **`wrong_attempts`** — the automaticity detector. See §3.
- **`resolved_without_up`** — resolved the interruption, then never confirmed up. The "completed the ritual and went back to bed" failure. **Expect this to be the dominant failure mode.** Track it from day one.

Per cohort, weekly:

- **`night_step_compliance`** — `promise_written / (promise_written + promise_skipped)`. Round-2 memo flagged this as the most likely point of failure in the whole design. If this drops below ~60% by week 2, the morning has nothing to show and the mechanism is dead regardless of how good the morning UX is.
- **D1 / D7 / D14 / D21 retention** — defined as *had an `alarm_fired` event*, not app opens.

---

## 3. The automaticity detector

This is the measurement that decides H2, and no competitor is instrumented for it.

If the interruption is automatizing, we will see, over days 1→21:
- `ms_from_render_to_resolve` **falling** toward motor-reaction floor (<1.5s), **and**
- `wrong_attempts` **falling to zero**, **and**
- `snooze_count` **rising back** toward baseline

That signature — getting faster and more accurate while the behavior regresses — means the user is pattern-matching, not reading. **Fast + accurate + regressing is the failure signal.** Healthy state is a *stable* resolve time in the 4–10s band with occasional wrong attempts, holding flat across three weeks.

**Required for this to be readable:** log `variant` on every `interruption_shown` — how many alternatives were presented, and how semantically similar the distractors were. Without it we cannot separate "user learned to read faster" from "distractors were too easy."

---

## 4. Baseline

The mechanism claim is comparative, so there must be a comparison. Cheapest valid design, no second cohort needed:

**Within-user randomization.** Each morning, independently randomized: **70% interruption / 30% plain dismiss.** Same user, same sleep debt, same life. Log the assignment on `alarm_fired`.

Two constraints:
- Randomize per *morning*, not per user. Between-user comparison at this sample size will be dominated by who happens to be a heavy snoozer.
- The 30% plain-dismiss mornings are not a degraded experience to apologize for — they are the only thing that makes the other 70% interpretable. Do not let them get quietly removed for "UX consistency."

---

## 5. Sample and duration

- **n ≈ 30–60** users completing 21 days. Recruited from the founder's TikTok audience.
- **21 days minimum.** 14 is where the novelty cliff appears in the literature; we need to see past it.
- Anything shorter measures novelty. Anything larger, at this stage, buys precision we cannot act on.

---

## 6. Qualitative, and when to collect it

Two touchpoints only. Both async, both one question.

- **Day 3** — *"What happened this morning?"* Open text. Catches early confusion and reliability failures while memory is fresh.
- **Day 15** — *"Is it still working? Why or why not?"* Open text. This is the H2 interview, and the phrasing must not lead.

Additionally: **every `morning_abandoned` triggers a single question that evening** — *"What happened?"* Abandonment is the highest-information event in the dataset and it is invisible in aggregate metrics.

---

## 7. Kill criteria — agreed in advance, before we see the data

Write these down now. Deciding them after the data arrives is how people talk themselves into another six months.

| Signal | Threshold | Meaning |
|---|---|---|
| H1 fails | interruption mornings show no snooze reduction vs. plain-dismiss by day 7 | mechanism doesn't work |
| H2 fails | day 8–21 advantage decays to <30% of the day 1–7 advantage | novelty app |
| Night step fails | compliance <60% at week 2 | design depends on a habit users won't form |
| Inertia tax too high | median `interruption_cost` >15s, or `wrong_attempts` rising with rage-quits | too hard for 6:30am |
| Reliability fails | any user experiences ≥2 missed/silent alarms | product cannot exist; fix before anything else |

**Reliability is not a metric to optimize. It is a precondition.** If it fails, everything else in this document is noise.

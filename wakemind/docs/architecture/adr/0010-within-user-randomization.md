# ADR-0010: Validation uses within-user randomization in the shipped build

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The mechanism claim is comparative, so it needs a control. A second cohort is
unaffordable at n≈30–60, and between-user comparison at that size is dominated
by who happens to be a heavy snoozer.

## Decision

Each morning is independently randomized: 70% interruption, 30% plain dismiss.
Assignment is logged on `alarm_fired`. This ships in the production build during
the validation window, behind a flag that can be set to 100% interruption once
the measurement completes.

## Consequences

**Accepted costs** — 30% of mornings deliver the plain experience. Testers must
be told, in the study consent, that the app varies deliberately.
**Benefits** — a valid causal comparison from a single small cohort, absorbing
sleep debt, chronotype and life circumstances automatically.
**Revisit when** — the validation window closes. Then set the flag to 100% and
write the superseding ADR.

## Note

The plain-dismiss mornings are not a degraded experience to be quietly removed
for consistency. They are the only thing that makes the other 70% interpretable.

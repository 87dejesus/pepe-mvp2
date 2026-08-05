# ADR-0008: The dismissal gesture never varies

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

An alarm is a safety-adjacent object. At 3am with a sick child, or in a hotel
before a flight, the user must be able to stop the noise without learning
anything. Alarm apps die on this: confusion at that moment produces rage,
uninstall and a one-star review, and the review is permanent.

There is also a mechanism reason: varying the gesture is variable practice,
which strengthens the general dismissal schema. It is counterproductive as well
as hostile. See ADR-0007.

## Decision

One gesture, learned once, identical forever. Variation lives entirely in the
content behind it.

A hard escape hatch always exists and is discoverable: holding the stop control
for 3 seconds ends the alarm without resolving the interruption. It is logged
as `morning_abandoned`, never punished, and never mentioned in a disapproving
tone.

## Consequences

**Accepted costs** — a determined user can always bypass the mechanism. This is
correct. A commitment device the user cannot escape is not a product, it is a
trap, and it will be reviewed as one.
**Benefits** — the alarm remains trustworthy under emergency; bypasses become
measurable signal instead of invisible churn.
**Revisit when** — never, without a very strong argument.

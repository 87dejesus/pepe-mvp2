# ADR-0007: The interruption uses varied mapping over self-authored content

- **Status:** Accepted
- **Date:** 2026-08-05
- **Criticality:** This is the product. Read before changing anything in the
  morning flow.

## Context

Every competitor in this category applies a *fixed* obstacle: a math problem, a
photo target, a set of pushups, a button across the room. All of them
automatize. The founder's own experience with a physical alarm clock placed
across the room is the canonical case: the obstacle did not break the habit, it
trained a longer one.

The mechanism that resists automatization is not difficulty and not physical
effort. Schneider & Shiffrin: automaticity develops under **consistent mapping**
(same stimulus, same response, every time) and is precluded under **varied
mapping**, where the correct response cannot be derived from the cue alone.

Rotating the *gesture* does not achieve this. Varying motor output is textbook
variable practice, which by the contextual-interference effect *improves*
learning and transfers to new variants — it would train users to be better at
dismissing alarms in general.

## Decision

One fixed dismissal gesture (ADR-0008). The **target** of that gesture is
content-dependent: the user confirms the promise they themselves wrote the
night before, distinguished from plausible alternatives. Which target is correct
changes daily and cannot be resolved without actually reading.

Distractors must be semantically plausible. A distractor set that can be
defeated by a positional or length heuristic voids the mechanism.

## Consequences

**Accepted costs** — the interruption costs a few seconds of controlled
processing at a moment when controlled processing is impaired. This is the
central tension of the product and it is bounded, not eliminated: if median
resolve time exceeds ~15s the design is too heavy (see kill criteria).
**Benefits** — the only known mechanism that does not decay into a tap-through
reflex. It is also structurally unavailable to competitors whose content is
generated rather than self-authored.
**Revisit when** — `wrong_attempts` trends to zero while `snooze_count`
regresses. That signature means the mapping has become predictable and the
distractor generator needs work — not that the mechanism is wrong.

## Explicitly forbidden without a superseding ADR

- Making the correct target visually distinctive
- Reducing the alternatives to one
- Allowing dismissal without resolving the target
- Rotating the gesture instead of the target

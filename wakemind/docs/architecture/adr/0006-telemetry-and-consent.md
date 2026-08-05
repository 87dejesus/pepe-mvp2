# ADR-0006: Telemetry is pseudonymous, consented, and content-free

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The MVP exists to produce a measurement (see `analytics/MEASUREMENT_SPEC.md`).
That requires events leaving the device. It does not require knowing what the
user wrote or what their meetings are called.

## Decision

- A random device-scoped identifier, generated on first launch. No IDFA, no
  email, no device fingerprinting.
- Explicit opt-in during onboarding, stating plainly that this is a study.
  Declining leaves the product fully functional.
- **No content ever leaves the device.** Not promise text, not event titles,
  not audio. Only the shapes described in the event schema: counts, durations,
  booleans, enums.
- Every field in the payload must be justified in `analytics/EVENT_DICTIONARY.md`
  before it is collected.

## Consequences

**Accepted costs** — some analyses are impossible (e.g. whether certain wording
predicts success). Accepted deliberately.
**Benefits** — a study we can describe honestly in one screen; a much smaller
breach surface; a clean App Review privacy declaration.
**Revisit when** — a specific question genuinely requires content, at which
point it needs its own consent, its own ADR, and a very good reason.

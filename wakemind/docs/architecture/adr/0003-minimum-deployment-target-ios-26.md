# ADR-0003: Minimum deployment target is iOS 26

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

AlarmKit ships in iOS 26. Before it, third-party alarms relied on background
audio tricks and notification workarounds that are unreliable by construction —
exactly the failure the product cannot afford. Supporting iOS 25 and below would
mean maintaining a second, worse alarm engine whose failures would be blamed on
the product.

## Decision

Minimum deployment target: iOS 26.0. No fallback alarm engine.

## Consequences

**Accepted costs** — a materially smaller addressable install base during
validation. Some recruited testers will be ineligible; screen for OS version
before enrolling them.
**Benefits** — one alarm path, system-guaranteed, testable. No silent-failure
class inherited from workarounds.
**Revisit when** — the mechanism is validated and reach becomes the constraint.
Not before. Reach is worthless if the alarm is unreliable.

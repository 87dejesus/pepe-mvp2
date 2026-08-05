# ADR-0005: Local-first, no user account in v1

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

Accounts add signup friction at the exact moment we are measuring activation,
and they turn calendar content and voice recordings into server-side personal
data with the obligations that follow. The validation run does not need
cross-device sync or account recovery.

## Decision

No accounts, no login. All product data lives on-device. Telemetry is
pseudonymous and device-scoped (see ADR-0006).

## Consequences

**Accepted costs** — reinstalling loses history; no cross-device continuity;
we cannot email a specific user from their data alone.
**Benefits** — no signup wall; drastically smaller privacy surface; App Review
is simpler; the study measures the product rather than the funnel.
**Revisit when** — retention is proven and users ask for their history to
survive a new phone. That is a good problem and a later one.

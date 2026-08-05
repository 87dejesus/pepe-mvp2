# Environments and flags

## Environments

`debug` (local, verbose logging, telemetry to console) ·
`beta` (TestFlight, real telemetry, study assignment active) ·
`release` (App Store, post-validation)

## Flags

Flags exist for the experiment, not for indecision.

| Flag | Purpose | Default |
|---|---|---|
| `study.randomizationEnabled` | 70/30 interruption/plain split (ADR-0010) | on during validation |
| `study.armAssignment` | H3 third arm: `list_only` \| `interruption_only` \| `both` | `both` |
| `telemetry.enabled` | follows user consent | off until consented |

**Flags are evaluated locally and never on the alarm path.** No network lookup
may sit between a scheduled time and a siren (`RELIABILITY_CONTRACT.md`).

Every flag has a removal date. A flag without one becomes permanent complexity.

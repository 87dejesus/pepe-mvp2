# Runbook

## Severity

- **S0 — an alarm did not fire, or fired silently.** Pre-empts everything,
  including the validation run.
- **S1 — the alarm path degraded** (late, no Lock Screen UI, escape hatch broken)
- **S2 — everything else**

## S0 response

1. **Contact the affected user the same day.** Apologise plainly; make no excuse
   and offer no explanation you cannot yet support.
2. Capture: device, iOS version, battery, Focus state, Low Power, force-quit
   status, timezone changes, exact scheduled and actual times.
3. Pull local telemetry queue if the user consents.
4. Reproduce on the matrix in `RELIABILITY_CONTRACT.md`.
5. **Pause new cohort recruitment** until root cause is known. Adding users to a
   broken alarm is how a study becomes an apology.
6. Fix, verify on hardware, write an ADR if the cause was architectural.

## Two S0s for the same user

Stop the validation run. Their behavioural data is no longer meaningful — a user
who doesn't trust the alarm behaves differently — and continuing damages both the
study and the relationship.

# Reliability contract

**Reliability is not a metric to optimise. It is a precondition.** If the alarm
fails, nothing else in this repository matters.

An alarm app carries a higher reliability bar than almost any consumer software:
a single silent morning can cost someone a flight, an exam or a job, and the
one-star review that follows is permanent. We are asking users to trust us with
the thing they already don't trust themselves with.

## The contract

1. **The alarm fires at the scheduled time, or we have failed.** No exceptions
   for battery, network, Focus, Silent mode, force-quit, or app crash.
2. **No silent failure.** If we cannot guarantee an alarm, we tell the user
   before they go to sleep — never after.
3. **The escape hatch always works.** 3-second hold ends the alarm without
   resolving the interruption (ADR-0008). It is never removed, never punished,
   never gated behind a paywall.
4. **The alarm path takes no new dependency** without an ADR. No network call,
   no third-party SDK, no analytics, no feature flag evaluation may sit between
   the scheduled time and the siren.
5. **Telemetry never blocks the alarm.** Events queue locally and flush later.
6. **Simulator verification is never sufficient** for anything on this path.

## Failure budget

Zero. There is no acceptable rate of missed alarms.

Any user experiencing **two missed or silent alarms** is a study-level failure:
stop the validation run and fix it before collecting more data. A cohort that
doesn't trust the alarm produces meaningless behavioural data.

## What must be verified on hardware, every release

- Locked overnight, face down, real sleep
- Silent mode; every Focus mode; Sleep Focus specifically
- Low Power Mode
- App force-quit before sleeping
- Cold boot, never unlocked since restart
- Airplane mode
- Timezone change and DST transition
- Device storage nearly full

## Incident response

Any missed alarm is **S0**. See `docs/engineering/RUNBOOK.md`. S0 pre-empts all
other work, including validation.

## Trust, and how we spend it

We may spend user patience on the interruption. We may never spend it on doubt
about whether the alarm will ring. Those are different currencies and only one
of them refills.

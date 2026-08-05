# Testing strategy

Testing an alarm is genuinely hard: the interesting behaviour happens while the
device is locked, at 6am, once per day. Strategy follows from that.

## Layers

**1. Pure logic (fast, most of the value).** `PromiseEngine` is I/O-free by
design, so distractor generation, target selection and variant assignment are
fully testable on any machine — including the Linux box this repo started on.

The most important test in the codebase: **distractors must not be defeatable by
a heuristic.** Assert that across many generations, the correct target is not
systematically the longest, shortest, first, last, or most calendar-like option.
If a heuristic wins, ADR-0007's mechanism is void and the product silently
becomes a tap-through.

**2. Contract tests.** `CalendarAccess` against a protocol fake — all-day
events, declined invites, overlapping events, empty days, timezone boundaries,
DST. Empty days matter: they are H6.

**3. Simulation.** An `AlarmEngine` harness that replays scheduling scenarios in
compressed time: DST shifts, timezone changes, reboots, force-quits.

**4. Device tests — the only ones that count for the alarm path.** The matrix in
`docs/architecture/RELIABILITY_CONTRACT.md`, run on hardware every release.
Simulator results are inadmissible here and no amount of green CI substitutes.

**5. Field telemetry.** `morning_abandoned` is the production test. An app that
only logs successes reports 100% success.

## What we do not test

SwiftUI layout beyond a few snapshots. Framework behaviour. Anything that would
be re-written by the next design pass.

## Coverage

No target percentage. `PromiseEngine` approaching complete; `AlarmEngine` every
branch that can end with a silent alarm; the rest as judgement dictates.

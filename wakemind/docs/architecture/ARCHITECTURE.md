# Architecture

Pre-code. This describes intent; it will be corrected by contact with AlarmKit
(SPIKE-001) and should be updated the day that happens.

## Shape

A single iOS app, local-first, no backend for product features. One outbound
path exists: pseudonymous telemetry (ADR-0006), which is fire-and-forget and
strictly off the alarm path.

```
                  ┌──────────────────────────────┐
   Calendar ──────▶ CalendarAccess (EventKit)    │
   (on device)     └───────────────┬──────────────┘
                                   │ Commitments
                  ┌────────────────▼──────────────┐
                  │ PromiseEngine                 │
                  │  night: capture + default     │
                  │  morning: target + distractors│
                  └────────────────┬──────────────┘
                                   │
   AlarmKit ◀──── AlarmEngine ─────┤ ← the path that must never fail
   (system)       schedule/fire    │
                                   │
                  ┌────────────────▼──────────────┐
                  │ App (SwiftUI)  night · morning│
                  └────────────────┬──────────────┘
                                   │ events (queued, never blocking)
                            Instrumentation ──▶ telemetry endpoint
```

## Layer rules

- **AlarmEngine** may depend on nothing but the system framework. No analytics,
  no networking, no feature-flag lookups. See `RELIABILITY_CONTRACT.md`.
- **PromiseEngine** is pure logic — no I/O, no UI. It is where the mechanism
  lives (ADR-0007), which means it is the most heavily tested module in the
  codebase and the one where distractor quality is decided.
- **CalendarAccess** wraps EventKit and returns domain types. Nothing above it
  knows EventKit exists, so ADR-0004 can be revisited without touching the app.
- **Instrumentation** is append-only, local-first, and may never throw into a
  caller on the alarm path.
- **App** holds no business rules. If a rule is in a SwiftUI view, it is in the
  wrong place and cannot be tested.

## Persistence

On-device only (ADR-0005). Promises, alarm config, morning outcomes, queued
telemetry. Audio in the app container, excluded from backup, deleted after its
morning (ADR-0011).

## Why modular before code

Two reasons, both practical. `PromiseEngine` must be testable without a device —
distractor quality decides whether the mechanism survives, and that has to be
provable on any machine, including the Linux box this was written on. And
`AlarmEngine`'s dependency ban is only enforceable if it is a real boundary
rather than a comment.

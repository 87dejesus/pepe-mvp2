# ADR-0002: Native iOS with Swift and SwiftUI

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The product's core interaction is an alarm that must pierce Silent mode and
Focus, own the Lock Screen, and reliably wake a sleeping person. On iOS this is
only possible through AlarmKit, which is a native framework with no
cross-platform bridge. React Native, Flutter and Expo would each require a
custom native module wrapping AlarmKit — all the native complexity, plus a
bridge, plus a debugging layer.

Android is deliberately out of scope for validation. See ADR-0003.

## Decision

Native iOS. Swift and SwiftUI. No cross-platform framework.

## Consequences

**Accepted costs** — iOS only; a Mac is required to build (currently blocking,
see `docs/engineering/DEV_SETUP.md`); Android work later starts from zero.
**Benefits** — direct access to AlarmKit, EventKit, Live Activities; no bridge
in the alarm path, which is the path that must never fail.
**Revisit when** — validation succeeds and Android becomes a growth
requirement. That is a rewrite of the app shell, not of the mechanism.

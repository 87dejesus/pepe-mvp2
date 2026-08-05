# Development setup

## Current blocker

The founder is on Windows. **AlarmKit builds only on macOS.** There is no
Windows path, and no cross-platform framework removes this (ADR-0002).

## What is required, with costs

| Item | Cost | Notes |
|---|---|---|
| macOS + current Xcode | see options | non-negotiable |
| iPhone on iOS 26 | may already own | simulator cannot verify the alarm path |
| Apple Developer Program | USD 99/yr | required for TestFlight; free provisioning expires every 7 days and will silently break an overnight test |
| TestFlight beta review | free, ~1–2 days | needed for external testers |

## Mac options

1. **Cloud Mac by the hour** (MacinCloud, Scaleway Apple silicon) — tens of
   dollars. **Recommended first step:** it is the cheapest way to run SPIKE-001
   and answer the riskiest question before committing to hardware.
2. **Mac mini M4, ~USD 599** — right answer once the spike passes. Cheaper than a
   year of cloud and far less friction.
3. **Expo / EAS cloud builds from Windows** — avoids a Mac, but AlarmKit has no
   Expo module, so this means writing a custom native iOS module and debugging it
   blind through remote build logs. Rejected for the riskiest API in the product.

## Once a Mac exists

1. Clone the repository
2. Open the workspace, resolve packages
3. Sign in with the Apple Developer account, select the team
4. Run SPIKE-001 (`docs/spikes/SPIKE-001-alarmkit.md`) **before** anything else

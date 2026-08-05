# SPIKE-001 — Does the AlarmKit lock-screen → app transition survive 6:30am?

- **Status:** Blocked on hardware (no macOS machine). Specified and ready to run.
- **Time box:** 2 working days. If unanswered, stop and report — do not extend.
- **Owner:** first person with a Mac
- **Blocks:** all application code

---

## The one question

> When an AlarmKit alarm fires on a locked iPhone, **how many actions, and how
> many seconds, separate the siren from the user seeing their promise?**

Everything else in this spike is in service of answering that.

## Why this comes before any code

The product's mechanism lives *inside* the app: today's commitments, and the
interruption over self-authored content. AlarmKit's alert UI is deliberately
restrictive — the system owns it, and developer reports describe progressively
less customisation. Live Activities are required to present alarm UI when the
device is unlocked.

If reaching the app requires a Face ID unlock plus a tap, then at 6:30am, half
asleep, the user is one swipe from the standard dismiss and the mechanism never
runs. **That failure would not show up in a simulator and would not show up in a
demo. It shows up in the field, after the app is built.**

This is the highest-leverage two days available to this project.

## Hypotheses under test

| # | Hypothesis | Kills |
|---|---|---|
| S1 | An AlarmKit alarm can present a custom button that opens the app directly from the Lock Screen | If false, the mechanism must move into whatever surface AlarmKit *does* own, or the product changes shape |
| S2 | That transition does not require biometric unlock, or requires only one | If it needs unlock + navigation, measure the real cost before designing around it |
| S3 | The alarm keeps sounding until the interruption is resolved, not until the app opens | If the siren stops on app launch, the user can open and drop the phone — the commitment evaporates |
| S4 | The alarm fires reliably through Silent mode, all Focus modes, and low-power mode | Precondition. See `docs/architecture/RELIABILITY_CONTRACT.md` |
| S5 | The app is launched into a usable state from cold, not merely foregrounded | Cold-launch latency at 6:30am is the real latency |

## Method

Build the smallest possible app that does nothing but schedule an alarm and
present one screen. No product surface, no calendar, no persistence.

**Test on physical hardware only.** Simulator results are inadmissible for S1–S5.

Matrix — run each at least three times:

| Condition | Why |
|---|---|
| Locked, face down, overnight | The real condition. Everything else is a proxy. |
| Locked, Silent mode on | Most common tester setup |
| Sleep Focus active | Our exact users have this on |
| Low Power Mode | Common overnight at <20% battery |
| App force-quit before sleeping | Users do this. Alarms must survive it. |
| Cold boot (phone restarted, never unlocked) | Worst case for scheduling |
| Airplane mode | The product must not need the network to ring |

Record for every run: **seconds from siren to promise visible**, and **number of
user actions** (swipe, unlock, tap — count each). Those two numbers are the
deliverable.

## Deliverable

A written answer at the bottom of this file, plus a **screen recording of the
locked-overnight case**. The recording is not documentation — it is the artefact
the interaction design gets argued about with, and it is very likely the first
piece of build-in-public content.

Throw the spike code away. It is not the app.

## Decision this feeds

| Outcome | What we do |
|---|---|
| Promise visible in ≤2 actions, ≤5s | Build as designed |
| Requires unlock, but ≤3 actions and ≤10s | Build, but the interruption must be worth the cost — tighten it |
| Siren stops on launch (S3 false) | Redesign: the alarm must be re-armable, or the interruption moves earlier |
| Custom Lock Screen action impossible (S1 false) | **Stop.** Re-open interaction design before writing product code. |

## Prerequisites

- macOS with current Xcode (rented by the hour is fine — cheaper than a Mac
  mini for answering one question)
- iPhone on iOS 26, used overnight for real
- Apple Developer Program ($99/yr) — free provisioning expires every 7 days and
  will silently break an overnight test

## Findings

<!-- Fill this in. Include the two numbers, the recording link, and the
     verdict against the decision table above. Then supersede this section
     with an ADR if the design changes. -->

_Not yet run._

# Privacy and data

## Principle

We read a user's calendar and record their voice in their bedroom. The only
defensible posture is that **none of it leaves the device**, and that we can
state this in one sentence without qualification.

## What we access

| Data | Permission | Leaves device |
|---|---|---|
| Calendar events | EventKit, user-granted | **never** |
| Promise text | none — user-authored | **never** |
| Promise audio | microphone, user-granted | **never** (ADR-0011) |
| Behavioural events | opt-in study consent | yes — counts, durations, enums only |

## What we never collect

Names, emails, contacts, location, IDFA, device fingerprints, event titles,
attendees, promise content, audio, health data.

## Consent

Two separate asks, never bundled:

1. **Calendar** — asked at the point of first value, not in onboarding. The app
   must be usable, and must clearly say what it does, before this is requested.
2. **Study telemetry** — explicit opt-in, plain language, stating that this is a
   research build. Declining leaves the product fully functional. This is not
   negotiable: a consent the user cannot decline is not consent.

## Permission failure paths

Every permission must have a designed refusal path. An app that dead-ends on
"no" is an app that gets deleted. Denied calendar access must still allow a
manually written promise — which is also the honest test of H6.

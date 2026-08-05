# ADR-0004: EventKit instead of the Google Calendar API

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The product needs to read today's commitments. The obvious route is the Google
Calendar API. It carries two problems that specifically damage the validation
run:

1. Calendar read is a Google *sensitive* scope. In `Testing` publishing status
   we avoid verification and CASA, but refresh tokens expire after 7 days —
   forcing every tester to re-authenticate twice inside a 21-day study. Each
   re-auth is a churn event landing directly on the retention curve we are
   trying to measure.
2. `Production` status requires verification and likely a CASA assessment
   (roughly USD 500–4,500, re-validated annually), plus weeks of latency.

EventKit reads the calendars already configured on the device — including
Google accounts added in iOS Settings, which most of the target ICP has.

## Decision

Read commitments through EventKit. No Google OAuth in the MVP.

## Consequences

**Accepted costs** — we depend on the user having added their account to iOS;
onboarding must detect an empty calendar store and guide them. We cannot read
calendars that exist only in a Google account not present on the device.
**Benefits** — one permission prompt, no OAuth, no verification, no compliance
spend, no token expiry, no 100-user ceiling. Also works with iCloud and Outlook
accounts at zero extra cost, without those being product features.
**Revisit when** — we need server-side calendar access (e.g. computing wake
times without the app running), or Android forces a shared backend.

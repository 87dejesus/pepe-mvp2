# ADR-0011: Voice promises never leave the device

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The night-before promise may be recorded in the user's own voice. Hearing
yourself from last night is the strongest version of the mechanism and the most
demonstrable one on camera. It is also biometric-adjacent personal data, spoken
in a bedroom, often about private commitments.

## Decision

Audio is captured, stored and played back entirely on-device, in the app's
container, excluded from backups. It is never uploaded, never transcribed
server-side, and never included in telemetry. Recordings are deleted
automatically after the morning they belong to, unless the user pins them.

## Consequences

**Accepted costs** — no server-side features involving audio; recordings do not
survive device loss.
**Benefits** — the strongest feature carries close to zero privacy liability;
the promise in App Review and in marketing is simple and true.
**Revisit when** — never for uploads. On-device transcription for accessibility
is permitted and does not require a new ADR provided the text also stays local.

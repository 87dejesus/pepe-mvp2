# Event dictionary

Every field that leaves the device, and why it is justified. **A field with no
justification here is not collected** (ADR-0006).

Canonical schema: `MEASUREMENT_SPEC.md` §1. This file is the review gate — any
PR adding or changing telemetry updates it in the same commit.

## Global fields

| Field | Type | Justification |
|---|---|---|
| `user_id` | random UUID, device-scoped | join events into a per-user series. Not an identity. |
| `local_timestamp` | ISO 8601 | morning behaviour is local-time behaviour |
| `utc_timestamp` | ISO 8601 | ordering across timezone changes |
| `timezone` | IANA | detects travel, which confounds sleep data |
| `app_version` | string | segregate cohorts across builds |
| `install_day_index` | int | **the H2 axis.** Everything is read against this. |

## Content-free rule

No field may carry user text, event titles, audio, or anything reconstructible
into them. Counts, durations, booleans and closed enums only.

`char_count` on `promise_written` is permitted: it measures effort, not content,
and cannot be inverted into text.

## Review checklist for new fields

- [ ] Which hypothesis needs it?
- [ ] Could it be reconstructed into content?
- [ ] Is a coarser form enough (bucket instead of exact value)?
- [ ] Does it survive the "read this aloud to the user" test?

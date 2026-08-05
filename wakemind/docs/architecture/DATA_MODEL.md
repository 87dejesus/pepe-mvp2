# Data model

On-device only (ADR-0005). No server-side copy of anything below.

## Entities

**Promise** — `id`, `forDate`, `text`, `audioRef?`, `source` (calendar_default |
user_written | user_voice), `createdAt`

**Commitment** — projection of an EventKit event: `id`, `title`, `startsAt`,
`isAllDay`. Read fresh each time; never persisted beyond the current morning.

**AlarmConfig** — `id`, `timeLocal`, `weekdays`, `enabled`

**MorningOutcome** — `id`, `date`, `variant`, `firstFiredAt`, `snoozeCount`,
`resolvedAt?`, `wrongAttempts`, `upConfirmedAt?`, `abandonedAt?`, `abandonMethod?`

**TelemetryEvent** — queued envelope; content-free by construction (ADR-0006)

## Retention

| Data | Kept | Then |
|---|---|---|
| Promise text | 30 days | deleted |
| Promise audio | until the morning it belongs to | deleted, unless pinned |
| MorningOutcome | 90 days | aggregated, raw deleted |
| Telemetry queue | until flushed | deleted on success |

Everything is deleted on app uninstall by construction — there is nowhere else
for it to live. "Delete everything" in settings must also work, and must be
verified.

## What we deliberately do not store

Event titles beyond the current morning. Attendees. Locations. Any calendar data
at rest. Any audio off-device. Any identifier that resolves to a person.

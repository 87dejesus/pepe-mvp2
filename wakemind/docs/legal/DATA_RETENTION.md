# Data retention

| Data | Location | Retention | Deletion |
|---|---|---|---|
| Promise text | device | 30 days | automatic |
| Promise audio | app container, backup-excluded | until its morning | automatic, unless pinned |
| Morning outcomes | device | 90 days | aggregated, then raw deleted |
| Telemetry queue | device | until flushed | on successful send |
| Telemetry (server) | endpoint | 90 days after study close | manual, logged |
| Calendar events | never persisted | — | — |

Uninstall removes everything on-device by construction. In-app "delete
everything" must also clear the pending telemetry queue, and this must be
verified rather than assumed.

# Threat model (lightweight)

Not a security theatre document. Four things could actually hurt someone.

| Threat | Impact | Mitigation |
|---|---|---|
| Voice recording leaks | Severe — bedroom audio, private commitments | Never uploaded (ADR-0011); app container; excluded from backup; auto-deleted |
| Calendar content leaks via telemetry | Severe — meeting titles are sensitive | Content-free schema, enforced in `EVENT_DICTIONARY.md` review |
| Alarm fails, user misses something critical | Severe, and it is *our* failure | `RELIABILITY_CONTRACT.md`; zero failure budget |
| Shared/stolen device exposes promises | Moderate | Promises are short and user-authored; no lock screen preview of content |

## Deliberate non-goals

No E2E encryption (nothing is transmitted). No account security (no accounts).
No jailbreak detection. Each is out of scope because the data isn't there to
protect — which is the strongest mitigation available and the reason for
ADR-0005.

# Not building

An anti-scope is a real artefact. Most product death is by accumulation, and
every item here was proposed seriously and rejected deliberately.

To build something on this list: delete it from this file in the same PR, with
the reason and the hypothesis it validates. Requiring the deletion is the point.

## Not in the MVP

| Item | Why not |
|---|---|
| AI-generated morning summaries | Validates nothing about the mechanism. Adds cost, latency and a failure mode to the one path that must not fail. |
| Outlook / Google OAuth integrations | EventKit already reads them if the account is on the device (ADR-0004). |
| Traffic and commute prediction | Genuinely valuable later. Not needed to test whether the interruption works. |
| Sleep tracking | Different product, different permissions, and a crowded category. |
| Streaks, points, badges | Gamification here slides into tallying, which slides into shame (ADR-0009). |
| Social features, friends, sharing to feed | No hypothesis. Large privacy surface. |
| Android | ADR-0002. Revisit after validation. |
| Accounts and cross-device sync | ADR-0005. |
| Multi-alarm scheduling, complex repeats | v1 supports one weekday morning alarm. Nothing about the mechanism needs more. |
| Widgets, watch app, StandBy | Surface expansion before the surface is proven. |
| Paywall and subscriptions | The validation cohort must not be filtered by willingness to pay. Price after H2 answers. |

## Deliberately unresolved

Recorded so nobody mistakes them for oversights:

- **Empty-calendar days.** The self-authored promise carries these, but this is
  an assumption, not a finding. Watch it in the day-3 qualitative.
- **What happens after 21 days.** Out of scope for the validation build.
- **Onboarding polish.** Deliberately crude until the mechanism is proven.

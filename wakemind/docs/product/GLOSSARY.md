# Glossary

Shared vocabulary. Code, docs and UI should use these words and no synonyms —
drift in language becomes drift in product.

| Term | Meaning | In code |
|---|---|---|
| **Promise** | The line the user writes the night before, in their own words, about why they're getting up | `Promise` |
| **Night step** | The 20-second evening flow that captures the promise | `NightStep` |
| **Interruption** | The morning screen that must be resolved before the alarm stops | `Interruption` |
| **Target** | The correct choice within the interruption — the user's actual promise | `InterruptionTarget` |
| **Distractors** | Plausible alternatives shown alongside the target | `Distractor` |
| **Varied mapping** | Design property where the correct response can't be derived from the cue alone. The mechanism (ADR-0007) | — |
| **Commitments** | Today's calendar events, shown in the morning flow | `Commitment` |
| **Inertia tax** | Seconds the interruption costs at peak grogginess. Bounded, measured | `interruption_cost` |
| **Escape hatch** | 3-second hold that ends the alarm without resolving. Always available, never punished (ADR-0008) | `EscapeHatch` |
| **Moral hangover** | The "I did it again" reckoning ~20 min after going back to bed. PT-BR: *ressaca moral*. Marketing register only (ADR-0009) | — |
| **Plain morning** | A randomly assigned morning with no interruption. The control (ADR-0010) | `MorningVariant.plain` |
| **Abandoned morning** | Alarm ended without an "I'm up" confirmation | `morning_abandoned` |

## Words we do not use

- *Mission*, *challenge*, *task* — Alarmy's and Wayk's vocabulary. We are not that product.
- *Streak* — see ADR-0009.
- *Snooze-proof*, *unstoppable* — false, and the escape hatch exists on purpose.

# Module map

Swift Package Manager targets. Names are provisional until code exists; the
boundaries and rules are not.

| Module | Owns | May depend on | Testable without a device |
|---|---|---|---|
| `AlarmEngine` | scheduling, firing, escape hatch | AlarmKit only | partially |
| `PromiseEngine` | promise model, target + distractor generation, variant assignment | Foundation only | **yes — fully** |
| `CalendarAccess` | EventKit wrapper, commitment domain types | EventKit | via protocol fake |
| `Instrumentation` | event schema, local queue, flush | Foundation, URLSession | yes |
| `DesignSystem` | typography, colour, the morning surface primitives | SwiftUI | snapshot only |
| `WakeMindApp` | composition, navigation, screens | all of the above | no |

## Rules

1. Dependencies point downward only. No module imports `WakeMindApp`.
2. `AlarmEngine` imports nothing beyond AlarmKit. Enforced in review; enforced in
   CI once CI exists.
3. `PromiseEngine` has no I/O. Everything it needs arrives as arguments. This is
   what makes the mechanism testable on any machine.
4. Cross-module types cross as domain types, never as framework types. No
   `EKEvent` above `CalendarAccess`.

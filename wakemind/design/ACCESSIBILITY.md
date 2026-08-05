# Accessibility

The morning surface is used by people who are barely awake, often without
glasses, in the dark. Accessibility here is not a compliance exercise — it is
the primary use condition, and designing for it improves the product for
everyone.

## Required

- **Dynamic Type** to the largest accessibility sizes, without truncation, on
  every morning screen
- **VoiceOver** on the full alarm path, including the interruption and the
  escape hatch
- **Contrast** WCAG AA minimum; AAA on the interruption
- **Touch targets** ≥ 60pt on the morning surface — larger than the 44pt
  standard, because motor precision is degraded at wake
- **Reduce Motion** respected; no animation gates the promise
- **No colour-only meaning.** The interruption's target must never be
  distinguishable by colour — which ADR-0007 forbids anyway, for a different
  reason that happens to point the same way.

## Explicitly tested

Interruption resolvable with VoiceOver alone, eyes closed. If it isn't, the
distractor design is leaning on visual layout — which means it is also
defeatable by a positional heuristic, and the mechanism is void.

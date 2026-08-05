# Engineering principles

1. **Every change answers "what hypothesis does this validate?"** If nothing,
   say so and justify it. Reliability, compliance and developer experience are
   valid answers. "It would be nice" is not.
2. **The alarm path is sacred.** No dependency, no network, no analytics between
   the scheduled time and the siren.
3. **Ship to learn, not to impress.** Crude onboarding with real instrumentation
   beats polished onboarding with none.
4. **Business rules live in testable modules,** never in views. If it can only be
   verified by launching the app, it is in the wrong place.
5. **Delete rather than flag.** Feature flags are for the validation split, not
   for indecision.
6. **Throw spike code away.** A spike answers a question. It is not a head start.
7. **Write the ADR when the decision is made,** not when someone asks why.

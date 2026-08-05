# WakeMind

A commitment device that interrupts automatic morning behaviour before it completes.

**Not an alarm clock.** An alarm is the delivery mechanism. The product is the
confidence that tomorrow morning will be different.

---

## Status

**Pre-code.** No application code exists yet, by design. The first code lands
only after `docs/spikes/SPIKE-001-alarmkit.md` resolves, because that spike can
invalidate the interaction design.

| | |
|---|---|
| Phase | Foundation → SPIKE-001 |
| Platform | iOS 26+, Swift/SwiftUI (ADR-0002, ADR-0003) |
| Blocker | No macOS machine available. See `docs/engineering/DEV_SETUP.md` |

## Read this first, in this order

1. `docs/product/PRODUCT_BRIEF.md` — what we are building and why
2. `docs/product/HYPOTHESES.md` — what we believe and how we'll know
3. `docs/architecture/adr/0007-varied-mapping-interruption.md` — the mechanism
4. `docs/architecture/RELIABILITY_CONTRACT.md` — what must never fail
5. `analytics/MEASUREMENT_SPEC.md` — how we learn anything

Five documents, about twenty minutes. If you only read one, read ADR-0007.

## Repository map

```
docs/product/       what we're building, why, for whom, and the discovery trail
docs/architecture/  how it's put together, plus ADRs (the "why" of decisions)
docs/engineering/   how we work: setup, testing, release, on-call
docs/spikes/        time-boxed technical questions, answered before they cost us
docs/legal/         privacy policy, retention, App Review notes
design/             principles, microcopy rules, accessibility, flows
analytics/          the measurement contract for the validation run
content/            build-in-public plan and demo design
```

## Non-negotiables

Three rules that override convenience. Each has an ADR.

1. **The alarm must never fail silently.** Reliability is a precondition, not a
   metric. (`RELIABILITY_CONTRACT.md`)
2. **The interruption's target must stay unpredictable.** Making it easier to
   guess destroys the product. (ADR-0007)
3. **The product never shames the user.** Guilt increases the behaviour we sell
   ourselves as fixing. (ADR-0009)

## Language

All project artefacts — code, docs, comments, commit messages, UI — are in
English. Team conversation may happen in any language.

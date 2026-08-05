## What hypothesis does this validate?

<!-- Required. If the answer is "none", explain why this ships anyway
     (reliability, compliance, and developer-experience work are valid answers). -->

## Change

<!-- What changed, in one paragraph. -->

## Evidence it works

<!-- Tests added/changed. For anything touching the alarm path, state how it
     was verified on a physical device. Simulator-only is not sufficient for
     the alarm path — see docs/architecture/RELIABILITY_CONTRACT.md -->

## Checklist

- [ ] Does not weaken the reliability contract
- [ ] Does not introduce shaming or tallying copy (design/CONTENT_STYLE_GUIDE.md)
- [ ] Does not make the interruption's target predictable (ADR-0007)
- [ ] Telemetry changes reflected in analytics/EVENT_DICTIONARY.md
- [ ] New architectural decision recorded as an ADR

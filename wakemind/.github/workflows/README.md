# CI

Empty until the first Swift lands. Planned on day one of code:

- `lint.yml` — SwiftLint + SwiftFormat, on PR
- `test.yml` — unit + AlarmEngine simulation suite, on PR
- `beta.yml` — TestFlight upload on tag, manual approval

CI requires macOS runners. GitHub-hosted macOS minutes are billed at a
higher rate than Linux — confirm the plan before enabling `beta.yml`.

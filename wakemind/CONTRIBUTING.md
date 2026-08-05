# Contributing

Written for a team of one, so that the team of five doesn't have to reconstruct it.

## Branching

- `main` — always releasable. Protected.
- `feat/<short-name>`, `fix/<short-name>`, `spike/<short-name>`, `docs/<short-name>`

No direct pushes to `main`. Every change lands through a PR, including your own.

## Commits

Conventional Commits: `type(scope): subject`

Types: `feat` `fix` `docs` `refactor` `test` `chore` `spike`

Subject in the imperative, lowercase, no trailing period. Body explains *why*,
not *what* — the diff already says what.

## Pull requests

Fill the template. The first question — "what hypothesis does this validate?" —
is not decorative. It is the filter that keeps this repository from accumulating
features nobody asked for.

Anything touching the alarm path needs evidence of physical-device verification.

## ADRs

Consequential decision → `docs/architecture/adr/`, next number, copy
`0000-template.md`. Append-only. To change a decision, supersede it.

## Definition of done

- [ ] Tests for the logic, not the framework
- [ ] Reliability contract intact
- [ ] Copy passes `design/CONTENT_STYLE_GUIDE.md`
- [ ] Telemetry documented
- [ ] CHANGELOG updated for anything user-visible

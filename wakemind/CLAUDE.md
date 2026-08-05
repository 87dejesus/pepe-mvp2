# CLAUDE.md — WakeMind

Instructions for AI agents working in this repository.

## Identity

- Product: **WakeMind** — a commitment device that interrupts automatic morning behaviour
- Not an alarm clock. The alarm is the delivery mechanism.
- Platform: iOS 26+, Swift, SwiftUI. Native only.

## Language rule

Every artefact in this repository is in **English**: code, comments, docs, ADRs,
commit messages, UI copy, issue titles. Conversation with the founder happens in
**Portuguese (Brazil)**. Never mix: do not write Portuguese into the repo, and do
not answer the founder in English.

## Before changing anything in the morning flow

Read `docs/architecture/adr/0007-varied-mapping-interruption.md`. The
interruption looks like it could be simplified. It cannot. Simplifying it is the
single most likely way to silently destroy this product.

## Hard constraints

1. **Reliability** — nothing may weaken the alarm path. Simulator verification is
   never sufficient for it. See `docs/architecture/RELIABILITY_CONTRACT.md`.
2. **No shaming copy** — no tallies, no streak-loss penalties, no comparisons to
   the user's past self. See ADR-0009 and `design/CONTENT_STYLE_GUIDE.md`.
3. **No content leaves the device** — not promise text, not event titles, not
   audio. See ADR-0006 and ADR-0011.
4. **No new dependency in the alarm path** without an ADR.

## Working agreements

- Every change answers "what hypothesis does this validate?" If the answer is
  none, say so explicitly and justify it (reliability, compliance and DX are
  valid answers).
- New consequential decision → new ADR. Append-only, never edit an accepted one.
- Telemetry change → update `analytics/EVENT_DICTIONARY.md` in the same commit.
- Do not add features that are listed in `docs/product/NOT_BUILDING.md` without
  first moving them out of that file, with a reason.

## Founder context

- No technical background. Explain in steps, name the exact button, state costs.
- Currently on Windows; no Mac. iOS work is specified now, built later.
- Prefers evidence over opinion. Cite the source or say it's a guess.

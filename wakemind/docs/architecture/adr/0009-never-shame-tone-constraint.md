# ADR-0009: The product never shames the user

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

The emotional core of the problem is what the founder calls *ressaca moral* —
the "I did it again" reckoning twenty minutes after going back to bed. The
intuitive product move is to use that feeling as motivation: snooze counters,
broken-promise tallies, streak-loss messaging.

The evidence says this backfires. Wohl, Pychyl & Bennett (2010) found that
students who forgave themselves for procrastinating procrastinated *less* next
time, mediated by reduced negative affect; follow-up work found shame-proneness
*increases* procrastination through the same pathway. Negative affect about a
past failure consumes the regulatory capacity needed to avoid repeating it.

A guilt-driven product would therefore increase the behaviour it sells itself
as fixing, and would show up in the data as churn among the most engaged users
— the hardest failure mode to diagnose.

## Decision

Shame is a **marketing** register and never a **product** register.

In-product, after any failed morning, the copy resolves forward and absolves:
"yesterday's done — here's tomorrow." Never a tally, never a streak-loss
penalty, never a comparison to the user's past self.

This is an engineering constraint, not a stylistic preference. It is enforced
in code review (see the PR checklist) and specified in
`design/CONTENT_STYLE_GUIDE.md`.

## Consequences

**Accepted costs** — we give up a well-known and effective short-term
engagement lever.
**Benefits** — we do not sabotage the outcome we are selling; retention among
struggling users, who are the ICP, stays intact.
**Revisit when** — never. If an experiment appears to show guilt improving a
metric, check the horizon: it will be short.

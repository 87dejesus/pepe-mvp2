# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

WakeMind's design rests on behavioural evidence that is not self-evident from
reading the code. Several decisions look like friction or over-engineering
unless you know the research behind them. Without a written trail, the most
likely failure mode is a future contributor "simplifying" a mechanism into
uselessness — and being right to, given the information they had.

## Decision

We record every consequential decision as an ADR in `docs/architecture/adr/`,
numbered sequentially, append-only.

## Consequences

**Accepted costs** — a few minutes per decision; discipline required.
**Benefits** — the "why" survives contributor turnover and our own memory.
**Revisit when** — never. This one is load-bearing.

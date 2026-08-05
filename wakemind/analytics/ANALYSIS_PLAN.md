# Analysis plan

Written before data exists. That timing is what makes it worth anything.

## Primary

**H1** — snoozes and time-to-up, interruption mornings vs. plain mornings,
within-user. Paired comparison; each user is their own control.

**H2** — the same effect split by `install_day_index`: days 1–7 vs. days 8–21.
Report the ratio. **This is the headline number of the entire study.**

## Secondary

- **Automaticity detector** — `interruption_cost` and `wrong_attempts` over
  time. The failure signature is *faster + more accurate + behaviour regressing*
  (`MEASUREMENT_SPEC.md` §3).
- **H3 arms** — `list_only` vs `interruption_only` vs `both`, if the third arm runs
- **H4** — night-step compliance by week
- **H6** — behaviour on zero-commitment mornings vs. others

## Rules agreed in advance

1. **No new hypotheses mid-run.** Anything discovered becomes a candidate for the
   *next* cohort, logged in `HYPOTHESES.md` as Open. Not a finding.
2. **Report abandonment alongside every success metric.** Success rates
   computed only over completed mornings are fiction.
3. **n≈30–60 does not support subgroup slicing.** Resist it. Splitting by
   ADHD/non-ADHD at this size produces noise that looks like insight.
4. **Kill criteria are read before results.** `MEASUREMENT_SPEC.md` §7.

## Output

One page in `docs/product/EXPERIMENT_LOG.md`: what ran, what we saw, what we
decided, what changed as a result. Written the same week the cohort ends, while
it is still uncomfortable.

# Scraper observability — plan

**Status:** planned, not built. Approved by the founder 2026-09-01.
**Do NOT start before the 2026-09-04 verification** (see *Sequencing* at the bottom).
**Owner doc:** `PROJECT_BRIEF.md` (canonical) — update it when this ships.

---

## The problem this solves

Three incidents, one pattern (see the incident log in `PROJECT_BRIEF.md`: 2026-05-19, 2026-07-01, 2026-09-01):

**The monitoring only ever asked "is it dead?", never "is it getting worse?"**

The watchdog checks exactly two things: Active count ≥ 20, and at least one listing fresh in 4 days. On 2026-09-01 the catalog answered "96 Active" for weeks — comfortably above the floor, no alarm — while:

- the volume per sync had dropped from ~190 items to 40 (an 80% cut),
- four of the five boroughs had stopped being scraped entirely,
- and the spend had fallen from ~$6/month to $0.17, which nothing was reading.

**Every one of those is a degradation that lives inside the green zone.** The alert only fired weeks later, when the decay finally crossed the floor — and even then it named the wrong cause ("scraper likely stalled").

The 2026-07 outage was the same shape: the scraper died Jul 1, the catalog hit zero, and it was found by hand on Jul 17.

**The fix is not a better threshold. It is giving the system a memory of its own output, and alerting on the shape of the data rather than on total collapse.**

---

## Part 1 — Record what every sync actually produced

Today `sync_runs` stores `run_id`, `status` (`started` / `collected` / `failed`), `created_at`. That is enough to know a run happened and nothing about what it was worth. On 2026-09-01 the "when did this start" question could only be answered from a screenshot of the Apify console, because **the system keeps no record of its own results**. Everything else here depends on fixing that first.

Add per-run outcome columns (or a `sync_reports` table — one row per collect pass, whichever is cleaner at implementation time):

```sql
ALTER TABLE sync_runs
  ADD COLUMN IF NOT EXISTS items_raw        integer,      -- returned by Apify
  ADD COLUMN IF NOT EXISTS items_normalized integer,      -- survived the normalizer
  ADD COLUMN IF NOT EXISTS items_upserted   integer,      -- actually written
  ADD COLUMN IF NOT EXISTS borough_counts   jsonb,        -- {"Manhattan":41,"Brooklyn":40,...}
  ADD COLUMN IF NOT EXISTS run_status       text,         -- SUCCEEDED / TIMED-OUT / ...
  ADD COLUMN IF NOT EXISTS finished_at      timestamptz;
```

`/api/apify/collect` already computes every one of these numbers in memory (`raw.length`, `normalized.length`, `synced`, and the per-run breakdown in its `perRun` array) — it just throws them away when the response returns. Persist them.

A high `items_raw` with a low `items_normalized` is its own signal: the actor changed its output shape and the normalizer is silently dropping rows. That is exactly the bug PR #38 found by hand in July (the `buildingType` guard was discarding 79% of rentals).

## Part 2 — Alert on degradation, not on the floor

With history in place, the watchdog gets rules that catch a problem in its first cycle instead of its twentieth. Each of these would have fired on 2026-09-01 weeks earlier than the actual alert:

| Rule | Catches |
|---|---|
| Any borough with 0 Active listings | The `maxItems` regression (4 of 5 boroughs starved) |
| Items collected this cycle < 50% of the trailing 3-cycle average | The 190 → 40 volume cut |
| A sync completes with `items_upserted = 0` while the table still looks healthy | A write path broken behind a full-looking catalog |
| `items_normalized / items_raw` < 70% | The actor changed its schema; the normalizer is dropping rows |
| No sync row at all in the last 4 days | The cron itself stopped firing (the current check cannot tell this apart from a scraper failure) |

Keep the existing floor and freshness checks. These are additions, not replacements.

**Alert-fatigue guard:** one email per watchdog run listing every rule that tripped, not one email per rule.

## Part 3 — A heartbeat, so silence stops being ambiguous

Send a short report every sync cycle, whether or not anything is wrong:

```
sync 2026-09-04: 5 runs, 198 items, 187 upserted
MN 41 / BK 40 / QN 39 / BX 38 / SI 29 — 210 Active (was 96)
```

This looks redundant next to the alert email. It is not, and it is the highest-value part of this plan:

**Right now, silence is ambiguous.** No email means either "everything is fine" or "the watchdog itself is dead". Those are opposite states and they look identical. In July the absence of noise read as health for 17 days.

With a regular heartbeat, **the absence of the heartbeat becomes the signal.**

Send it through Resend, same path as `sendAlertEmail` in `app/api/cron/watchdog/route.ts`. Every 3 days is the right cadence — frequent enough to notice a gap, rare enough to keep reading.

---

## The `updated_at` trigger — recommended AGAINST, on reflection

A `moddatetime` trigger was floated on 2026-09-01 as belt-and-braces so a future writer could not reintroduce the frozen-`updated_at` bug. **Don't do it as a blanket trigger.**

`updated_at` is not really a "row was modified" column here. `/api/cron/cleanup` reads it as **"when did we last see this listing live on StreetEasy"** and expires anything older than 10 days. A blanket `BEFORE UPDATE` trigger breaks that meaning: the cleanup cron's own `status = 'Expired'` write would bump the timestamp of the very row it is expiring, and any future column edit — a backfill, a manual fix in the Supabase UI — would silently look like fresh scraper evidence.

The durable fix, if this is worth hardening later, is a **separate `last_seen_at` column** owned exclusively by the scraper paths, with `cleanup` and the watchdog keyed off that instead of `updated_at`. That is a migration plus changes in four routes — worth doing only if a second writer to `listings` ever appears.

Until then, the explicit stamp shipped in PR #49 (both upsert paths set `updated_at` themselves) is correct and sufficient.

---

## Sequencing

**Do not start before the 2026-09-04 check-in confirms PR #49 worked.** Changing the watchdog now would destroy the clean baseline needed to tell whether the catalog actually recovered. Verify first, then build.

Order once unblocked:

1. Part 1 (the schema + persisting what `collect` already computes) — everything else depends on it
2. Part 3 (the heartbeat) — smallest change, biggest safety gain, and it exercises the new data immediately
3. Part 2 (the degradation rules) — needs a few cycles of history before the trailing-average rule means anything

Costs nothing extra on Apify: this reads data the syncs already produce. No user-facing surface changes.

## Non-goals

- Not a dashboard. Email is the channel the founder actually reads (the Sentry lesson from 2026-07: same-message alerts group into one issue, so 17 days of alerts produced one notification nobody saw).
- Not a scraper change. If the `memo23/streeteasy-ppr` timeouts continue after 2026-09-04, that is a provider question — run `/scraper-provider-evaluator` before spending Apify credit on any alternative.

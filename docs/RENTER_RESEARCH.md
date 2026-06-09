# NYC Renter Decision Research — findings & quiz recommendations

**Source:** deep-research pass (2026-06-09), 103 agents, 21 sources, 25 claims adversarially verified (23 confirmed, 2 refuted). Primary sources include NYC Council, NYC Rent Guidelines Board, NY HCR; secondary: Brick Underground, Documented NY.

## The 4 forces behind NYC renter stress / regret / confidence

1. **Upfront cash + qualification barriers (the dominant financial stressor).** Broker fees historically 1 month to ~12-15% of annual rent; ~$13,000 average move-in cost (2023); landlords prefer **40x monthly rent income**; guarantors typically need **80x rent + 700 credit + tristate residency**. NYC law caps the deposit at **1 month**, the only legal upfront = deposit + first month, and application fees at **$20** — so excess demands are a verifiable red flag.
2. **Scams & misrepresentation.** Ghost listings, fake brokers who "can't show the unit," below-market bait, demands to pay by app before viewing. Confident renters verify legitimacy BEFORE paying or signing.
3. **NYC-specific legal/financial structure not shown in listings.** Rent stabilization (~1M units, capped increases ~2.75-3%, guaranteed renewal) is not advertised and must be verified; plus 421-a/J-51 tax riders, Good Cause Eviction, bed-bug disclosure, and being a named tenant on the lease.
4. **Housing-type confusion.** Co-living / shared-room units carry **individual per-room leases**, strangers, and relaxed income/guarantor rules — structurally different from a whole-unit rental. Directly matches the ~30% of our catalog mislabeled as studio/1BR.

Plus a recurring regret: **hidden recurring costs** (utilities, laundry-room fees, parking) — clarify who pays before signing.

## 2 myths the research KILLED (do not over-weight)

- ❌ "Noise is the most common regret" — refuted 0-3.
- ❌ "Units rent in hours; waiting costs $300+/mo" — refuted 0-3. **This validates The Steady One's no-fake-urgency stance** — the FOMO framing is not supported.

## Recommended quiz question set

### Tier 1 — true non-negotiables (drive the scorecard MET/MISSED)
1. **Housing type** — "Do you want your own whole place, or are you open to a private room in a shared/co-living apartment?" → Whole place only / Private room in a shared place is fine / Show me both. *(fixes the ~30% mislabel; hard dealbreaker for most)*
2. **Budget + upfront-cost reality** — "Max monthly rent, AND roughly how much cash for move-in (deposit + first month + fees)?" → rent value + upfront tiers (<$5k / $5-10k / $10-15k / $15k+). *(stated rent hides ~$13k true move-in)*
3. **Qualification fit** — "Will your income reach ~40x the monthly rent, or will you need a guarantor / guarantor service?" → Yes, 40x / I'll use a guarantor / I'll need a guarantor service or low-barrier building / Not sure. *(feasibility gate; ties to co-living's relaxed requirements)*
4. **Borough/neighborhood + commute** — keep, add a commute anchor ("Where do you commute to most days?").
5. **Move-in timing** — keep.

### Tier 2 — NYC differentiators (feed the tradeoff ledger; mostly nice-to-have)
6. **Rent-stabilization preference** — "Flag rent-stabilized units (capped increases, guaranteed renewal)?" → Strongly prefer / Nice to have / Don't care.
7. **Scam-safety / verification** — a safeguard layer (checklist: meet in person, never pay by app before viewing, $20 fee cap, deposit = 1 month max), not a filter.
8. **Dealbreaker amenities** — split true dealbreakers vs wants (elevator/walk-up, laundry, pets): "hard no vs nice-to-have?" to populate the give-up ledger.

**DEMOTE:** bathrooms (low signal) — fold into amenities or drop.

**Phrasing principle:** lead each with reassurance and let the renter mark **hard-no vs flexible** — exactly what powers "non-negotiables held vs tradeoffs accepted."

## Caveats (important)

- **FARE Act (June 2025):** broker fee now falls on whoever HIRES the broker, so most renters who don't hire an agent no longer pay the 12-15% fee. Treat broker fee as **"possible," not "guaranteed."**
- **Local Law 86 / Rent Transparency (Jan 2026):** stabilization disclosure now via signage + lease, but still NOT in listings — "verify yourself" still holds.
- **40x / 80x are preferences, not law;** guarantor services (Insurent, TheGuarantors ~27.5x) relax them — phrase the qualification question to capture those workarounds.
- The question set is a **design synthesis, not a verified claim** — needs A/B testing with real users.

## Open questions for us

- Post-FARE-Act, what share of our catalog actually carries a tenant-paid broker fee? Quiz question vs per-listing flag?
- Real distribution of qualification barriers among our users (40x unaided vs guarantor vs low-barrier)?
- Can we classify the catalog into whole-unit vs shared/student reliably enough to match the housing-type answer? (the 30% mislabel says source data can't be trusted blindly — we now flag it in `housing_type`.)
- Which Tier-2 factors most change confidence in usability testing; is scam-safety a passive checklist or an active per-listing trust score?

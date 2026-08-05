# Release process

## Channels

- **Internal** — TestFlight internal, founder + collaborators, every build
- **Study cohort** — TestFlight external, the 30–60 validation testers
- **App Store** — not until H1 and H2 have answered

## Versioning

`MAJOR.MINOR.PATCH` + build number. During validation, **the version stays
frozen mid-cohort.** A cohort spread across three builds produces uninterpretable
retention data.

## Before every release

- [ ] Reliability matrix run on hardware (`RELIABILITY_CONTRACT.md`)
- [ ] No change to interruption difficulty mid-cohort — it would break the H2 slope
- [ ] Copy reviewed against `design/CONTENT_STYLE_GUIDE.md`
- [ ] Telemetry schema unchanged, or the analysis plan updated with it
- [ ] CHANGELOG updated

## Rollback

There is no rollback on iOS. Assume every shipped build is permanent for at
least 24 hours, and treat the pre-release checklist accordingly.

# CLAUDE.md — The Steady One (pepe-mvp2)

## Identity
- Product: The Steady One — apartment curation platform for NYC renters
- Mascot: Heed, the crocodile 🐊 (NEVER say "Pepe")
- Domain: thesteadyone.com
- Repo: github.com/87dejesus/pepe-mvp2

## Stack
- Next.js 16, React 19, TypeScript, Tailwind CSS v4
- Supabase (auth + database), Stripe (one-time payment, NEVER subscription)
- Vercel (hosting + cron), Apify (scraper), Resend (SMTP), Sentry (monitoring)

## Critical Rules
1. Table name is `listings` (NOT `pepe_listings`)
2. Stripe mode is `payment` (NEVER `subscription`) — $9.49 / 30 days
3. Price ID: `price_1TELqs08QwenlVoW1ECZCj4s`
4. Apify tests: ALWAYS use `maxItems: 3` or less. NEVER run without explicit limit
5. Never assume info — always confirm with the user
6. Error received → fix immediately, don't ask
7. Visual changes → mockup first, code only after approval
8. Persistent visual bugs → rebuild from scratch, never patch
9. Push to GitHub → batch maximum fixes together

## Database
- Provider: Supabase (project "Projeto Pepe")
- Main table: `listings`
- Sync: Apify cron 6:00 UTC (sync) + 6:10 UTC (collect)

## Scraper Rules
- Production provider: `epctex~apartments-scraper-api`
- New provider candidate: RentHop (Brooklyn only, manual, Phase 1)
- Run `/scraper-provider-evaluator` skill before testing any new paid actor/provider
- Never spend Apify credits on new actors without evaluation first

## Communication
- Founder has no technical background — prefer step-by-step with screenshots
- Prompts to Claude Code → English, complete in one shot
- End of session → generate updated CONTEXT.md
- "Don't say anything yet" → respond only 👍
- Be direct and objective — zero fluff

## Memory Reminders
- Keep this file updated when project facts change
- If context gets long, summarize key facts at the top of responses
- Use plan mode for tasks touching multiple files

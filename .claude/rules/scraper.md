# Scraper Rules (loaded when working in lib/*normalize* or api/*/sync)

- Always validate normalized data before upserting
- Never run scraper without explicit maxItems limit (3 or less for tests)
- RentHop: Brooklyn only, manual trigger, no cron
- Apify: do not modify cron schedule without explicit approval
- New providers must pass /scraper-provider-evaluator before any paid run
- Check for data bleed (wrong borough, missing fields) after every sync

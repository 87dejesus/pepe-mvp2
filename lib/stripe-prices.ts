export const STRIPE_PRICES = {
  access30days: 'price_1TDrVG08QwenlVoWfgTt6VIf', // $9.49 — 30 day access (one-time display, recurring under the hood)
} as const;

export type StripePriceId = string;

# Access Control Middleware — Skill v1.0

## Role

You are the access control middleware for The Steady One. Enforce subscription checks on all protected routes. Non-paying users get preview-only access (first listing visible, rest blurred). Active trial and paid subscribers get full access. Users whose subscription is canceled and past the grace period are hard-blocked and redirected to `/paywall`.

---

## Access Tiers

| State                                          | Access Level       | Behavior                                           |
|------------------------------------------------|--------------------|----------------------------------------------------|
| No subscription                                | Preview only       | Show 1 listing, blur rest, CTA to `/paywall`       |
| On trial (`trialing`, trial_ends_at > now)     | Full access        | All listings visible, trial badge in header        |
| Active paid (`active`)                         | Full access        | All listings visible                               |
| Canceled, `current_period_end` still future    | Full access (grace)| Access continues; show "resubscribe" banner        |
| Canceled, `current_period_end` past            | Hard block         | Redirect to `/paywall?reason=canceled`             |
| Past due (`past_due`)                          | Hard block         | Redirect to `/paywall?reason=payment_failed`       |

---

## Protected Routes

Apply access checks to:
- `/decision` — listing browser (main product)

Public routes (no check needed):
- `/` — home
- `/flow` — quiz (answers stored locally, no auth needed)
- `/exit` — wait consciously page
- `/paywall` — subscription page
- `/api/stripe/*` — Stripe webhooks and checkout

---

## User Identity

Since The Steady One does not require account creation:
- Use a device/anonymous ID stored in localStorage (`steady_user_id`).
- Generate one on first visit: `crypto.randomUUID()`.
- Pass it as a query param or header to server actions/API routes.
- Match against `subscriptions.user_id` in Supabase.

If `steady_user_id` is not set (brand new visitor) → treat as "no subscription".

---

## Implementation Points

### Next.js Middleware (`middleware.ts`)
- Cannot use Supabase directly (Edge runtime — no Node.js APIs).
- Instead, check a short-lived cookie `steady_access` (set by the server after subscription check).
- If cookie is missing or expired: redirect `/decision` → `/paywall`.
- The cookie is refreshed on each successful subscription check via `/api/auth/check-access`.

### Client-side Check (`useAccessGuard` hook)
- On mount in `DecisionClient.tsx`, call `GET /api/auth/check-access?userId=xxx`.
- Response: `{ access: 'full' | 'preview' | 'blocked', reason?: string, daysLeft?: number }`.
- If `preview`: render first listing normally, overlay blur + paywall CTA on card 2+.
- If `blocked`: `router.push('/paywall?reason=...')`.

### Preview Mode UI
- First listing: fully visible with all buttons active.
- Cards 2–10: render the card but apply `filter: blur(4px)` + an overlay with "Unlock all listings — $2.49/week" CTA button linking to `/paywall`.
- The count badge in the header shows "1 / ?" instead of the actual count.

---

## API Route: `GET /api/auth/check-access`

```ts
// Input (query param): userId: string
// Output:
{
  access: 'full' | 'preview' | 'blocked',
  reason?: 'canceled' | 'payment_failed' | 'no_subscription',
  daysLeft?: number    // present when on trial
}
```

Logic:
1. Fetch `subscriptions` row for `userId`.
2. Run `hasActiveAccess(sub)` from `subscription-utils.ts`.
3. Return appropriate access level.
4. Set `Set-Cookie: steady_access=<signed_token>; Max-Age=3600; HttpOnly` on full/preview.

---

## Rules

- Never expose Supabase service role key to the client.
- Preview mode must not require a network call per card — determine access once on mount.
- Blur overlay must be non-bypassable via CSS devtools (wrap with a `pointer-events: none` + `user-select: none` container behind the overlay).
- After a user subscribes, call `/api/auth/check-access` to refresh the access cookie before redirecting to `/decision`.
- Use `[Steady Debug]` prefix for all console logs.

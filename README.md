# Autodelen Calculator

A small, mobile-friendly web app for estimating and comparing Belgian
carsharing trip prices between **Cambio** and **Dégage**.

- Pick Cambio, Dégage, or both.
- **Cambio**: choose a package (Start / Bonus / Comfort), car category,
  start/end date & time, and distance.
  - Hourly rate depends on time of day: a day rate (06:00-24:00) and a
    cheaper night rate (00:00-06:00), split per calendar day the trip
    touches.
  - Each calendar day's time cost is capped at that category's day rate; a
    run of 7 consecutive calendar days can instead be billed at a flat
    weekly rate when that's cheaper.
  - The per-km rate drops after the first 100 km.
- **Dégage**: choose category A or B and a distance. Dégage only charges
  per km (fuel included, no hourly/subscription fee), tiered: one rate for
  the first 100 km, a lower rate for 100-200 km, and a lower rate again
  beyond 200 km.
- **Both**: fills in all of the above and shows the two totals side by side,
  highlighting the cheaper option.

The full pricing model lives in `lib/calc.ts` (`calculateCambio` /
`calculateDegage`) and `lib/types.ts`. Cambio's day/day-cap/week-cap
interaction is an interpretation of the publicly described structure (no
official rulebook was available while building this) — the "day-by-day,
capped, with the cheaper of daily-caps-summed vs. a weekly-cap" logic is
documented inline in `calc.ts` and should be checked against cambio.be's
actual terms if the exact cap precedence matters for your use case.

## Pricing data & the update mechanism

Live rates aren't hardcoded from a single fetch — they live in
`lib/pricing-seed.ts` as a bootstrap fallback, and can be overridden by a
small persistence layer (`lib/pricing-store.ts`) so the whole app can be
refreshed without a redeploy.

**`/admin`** is the pricing console:

1. **Fetch latest** — calls `POST /api/pricing/update`, which fetches
   `cambio.be` and `degage.be` live and runs a best-effort text scan
   (`lib/scrape-cambio.ts`, `lib/scrape-degage.ts`) for euro amounts near
   package/category names and Dégage's `0-100 km` / `100-200 km` / `vanaf
   201 km` bracket labels. It reports a confidence level and shows the raw
   matches — this is a starting point for a human to check, not a
   guaranteed structured parse of either page. Cambio's page also has some
   tiers inside expandable sections that may only load via JavaScript,
   which a plain HTML fetch can miss.
2. **Review & edit** — every rate is editable inline. Dégage's high-confidence
   suggestions (all 3 km brackets found for a category) can be applied with
   one click. Cambio's larger package × category × time-band × km-bracket
   matrix always needs a human glance since a text scan can't safely
   reconstruct a whole pricing table unattended.
3. **Save** — persists to Vercel KV / Upstash Redis if configured (see
   below). Without persistence, Save shows the JSON to paste into
   `lib/pricing-seed.ts` before redeploying.

A daily Vercel Cron job (`vercel.json` → `/api/cron/update-pricing`) reruns
the same scrape. It auto-applies Dégage's numbers when confident and
persistence is configured; Cambio is left for manual review via `/admin`.

> The sandbox this app was built in has no outbound access to cambio.be or
> degage.be, so the shipped seed numbers are placeholders (flagged
> `needsReview` in the data and with a banner in the UI). Once deployed to
> Vercel, run **Fetch latest** on `/admin` to pull and confirm the real
> numbers.

### Optional: enable persistent pricing updates

Without any setup the app works fine using the bundled seed data. To let
"Save" and the daily cron job persist updates for every visitor:

1. In the Vercel dashboard, open the project → **Storage** → add an
   **Upstash Redis** (or Vercel KV) database — free tier is enough.
2. Vercel automatically sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) on the project —
   either naming is supported.
3. Optionally set `CRON_SECRET` (Vercel sets this automatically for Cron
   Jobs on paid plans; on Hobby you can set it yourself under
   **Settings → Environment Variables** and Vercel's cron invoker will send
   it as a bearer token).

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000. The pricing admin is at `/admin`.

## Deploying to Vercel (free tier)

1. Push this repo to GitHub.
2. In Vercel, **Add New… → Project**, import the repo, and deploy — no
   configuration needed for the calculator itself.
3. (Optional) follow "Enable persistent pricing updates" above so pricing
   refreshes apply for everyone instead of just being shown for review.

The included `vercel.json` schedules the daily pricing check; Hobby (free)
projects support cron jobs that run at most once a day, which this respects.

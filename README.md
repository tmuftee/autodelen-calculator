# Autodelen Calculator

A small, mobile-friendly web app for estimating and comparing Belgian
carsharing trip prices between **Cambio** and **Dégage**.

- Pick Cambio, Dégage, or both.
- **Cambio**: choose a package (Start / Bonus / Comfort), car category,
  start date & time, and distance. Trip length can be entered either as an
  explicit end date & time, or as a duration in hours + 15-minute
  increments added to the start time.
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
`calculateDegage`) and `lib/types.ts`. Cambio's seed numbers
(`lib/pricing-seed.ts`) are transcribed from its Start/Bonus/Comfort x
S/M/L/XL pricing tables; the day/day-cap/week-cap interaction (day-by-day,
capped, with the cheaper of daily-caps-summed vs. a weekly-cap) is this
project's interpretation of that structure, documented inline in
`calc.ts` — check it against cambio.be's actual terms if the exact cap
precedence matters for your use case.

## Pricing data & the update mechanism

Live rates aren't hardcoded from a single fetch — they live in
`lib/pricing-seed.ts` as a bootstrap fallback, and can be overridden by a
small persistence layer (`lib/pricing-store.ts`) so the whole app can be
refreshed without a redeploy.

**`/admin`** is the pricing console, gated behind HTTP Basic Auth (see
"Admin password" below) so only you can view or change it:

1. **Fetch latest** — calls `POST /api/pricing/update`, which fetches
   `cambio.be` and `degage.be` live and parses their actual HTML:
   - `lib/scrape-cambio.ts` walks each package's `.block-content--type-pricing`
     block and reads its `table.tablefield` rows directly (monthly/activation
     fee, then each class's day/night hourly rate, day cap, week cap, and
     the two km-bracket rates), matched by table `<caption>` text. A
     package is marked "complete" only if every field for every class (S/M/L/XL)
     was found.
   - `lib/scrape-degage.ts` looks for the `0-100 km` / `100-200 km` / `vanaf
     201 km` bracket labels near each category's heading.
   - Both are structural parses, not guesses, but still tied to today's
     markup — if cambio.be or degage.be redesign their pricing page, a
     scrape can come back incomplete (or wrong) and should be checked
     against the source link before saving.
2. **Review & edit** — every rate is editable inline, and a "complete"
   package/category from the scrape can be applied with one click.
3. **Save** — persists to Vercel KV / Upstash Redis if configured (see
   below). Without persistence, Save shows the JSON to paste into
   `lib/pricing-seed.ts` before redeploying.

A daily Vercel Cron job (`vercel.json` → `/api/cron/update-pricing`) reruns
both scrapes and auto-applies whatever comes back "complete" when
persistence is configured; anything incomplete is left alone (and Cambio's
`needsReview` flag is set) for a human to check via `/admin`.

### Admin password

`/admin` (the page itself, plus `POST /api/pricing` and `POST
/api/pricing/update`) is protected by `proxy.ts` using HTTP Basic Auth. Set an `ADMIN_PASSWORD` environment variable — any username is
accepted, only the password is checked. Without `ADMIN_PASSWORD` set, the
admin routes are disabled entirely (503) rather than left open, so a
deployment can never accidentally ship an unprotected admin page. The
public calculator and `GET /api/pricing` are unaffected either way.

In Vercel: **Settings → Environment Variables** → add `ADMIN_PASSWORD`.
Locally, put it in `.env.local` (already gitignored).

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

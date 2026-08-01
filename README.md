# Autodelen Calculator

A small, mobile-friendly web app for estimating and comparing Belgian
carsharing trip prices between **Cambio** and **Dégage**.

- Pick Cambio, Dégage, or both.
- **Cambio**: choose a package (Start / Bonus / Comfort), car category,
  start/end date & time, and distance. The price is time-based (hourly rate,
  capped by a day rate) plus a per-km rate, both of which depend on the
  package and car category.
- **Dégage**: choose category A or B and a distance. Dégage only charges
  per km (fuel included) — no hourly or subscription fee.
- **Both**: fills in all of the above and shows the two totals side by side,
  highlighting the cheaper option.

## Pricing data & the update mechanism

Live rates aren't hardcoded from a single fetch — they live in
`lib/pricing-seed.ts` as a bootstrap fallback, and can be overridden by a
small persistence layer (`lib/pricing-store.ts`) so the whole app can be
refreshed without a redeploy.

**`/admin`** is the pricing console:

1. **Fetch latest** — calls `POST /api/pricing/update`, which fetches
   `cambio.be` and `degage.be` live and runs a best-effort text scan
   (`lib/scrape-cambio.ts`, `lib/scrape-degage.ts`) for euro amounts near
   package/category names. It reports a confidence level and shows the raw
   matches — this is a starting point for a human to check, not a
   guaranteed structured parse of either page.
2. **Review & edit** — every rate is editable inline. Dégage's high-confidence
   suggestions can be applied with one click since it's just two numbers
   (category A / B, €/km). Cambio's package × category matrix always needs a
   human glance since a text scan can't safely reconstruct a whole pricing
   table unattended.
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

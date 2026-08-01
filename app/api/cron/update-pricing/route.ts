import { NextRequest, NextResponse } from "next/server";
import { getPricing, isPersistenceConfigured, savePricing } from "@/lib/pricing-store";
import { scrapeCambio } from "@/lib/scrape-cambio";
import { scrapeDegage } from "@/lib/scrape-degage";

/**
 * Intended to be hit periodically by Vercel Cron (see vercel.json).
 *
 * Dégage's pricing is just two numbers (per-km rate for category A and B),
 * so when the scrape is confident it is auto-applied. Cambio's pricing is a
 * package x category matrix which a text scan can't safely reconstruct
 * unattended, so cron only records that a check happened and leaves the
 * `needsReview` flag for a human to reconcile via /admin.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data: current } = await getPricing();
  const now = new Date().toISOString();
  const summary: Record<string, unknown> = { checkedAt: now };

  try {
    const degageScrape = await scrapeDegage();
    summary.degage = { confidence: degageScrape.confidence, notes: degageScrape.notes };

    if (
      degageScrape.confidence === "high" &&
      degageScrape.suggestedCategoryA !== null &&
      degageScrape.suggestedCategoryB !== null &&
      isPersistenceConfigured()
    ) {
      current.degage = {
        ...current.degage,
        asOf: now.slice(0, 10),
        needsReview: false,
        categories: current.degage.categories.map((c) =>
          c.categoryId === "A"
            ? { ...c, pricePerKm: degageScrape.suggestedCategoryA! }
            : c.categoryId === "B"
              ? { ...c, pricePerKm: degageScrape.suggestedCategoryB! }
              : c
        ),
      };
      summary.degageUpdated = true;
    }
  } catch (err) {
    summary.degageError = err instanceof Error ? err.message : String(err);
  }

  try {
    const cambioScrape = await scrapeCambio();
    summary.cambio = { confidence: cambioScrape.confidence, notes: cambioScrape.notes };
  } catch (err) {
    summary.cambioError = err instanceof Error ? err.message : String(err);
  }

  current.lastAutoCheck = now;
  if (isPersistenceConfigured()) {
    await savePricing(current);
  }

  return NextResponse.json(summary);
}

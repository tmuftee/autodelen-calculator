import { NextRequest, NextResponse } from "next/server";
import { getPricing, isPersistenceConfigured, savePricing } from "@/lib/pricing-store";
import { scrapeCambio } from "@/lib/scrape-cambio";
import { scrapeDegage } from "@/lib/scrape-degage";
import { KmBracket } from "@/lib/types";

function isBracket(b: KmBracket | null): b is KmBracket {
  return b !== null;
}

/**
 * Intended to be hit periodically by Vercel Cron (see vercel.json).
 *
 * Dégage's pricing is a small, fixed-shape km-bracket table per category, so
 * when the scrape confidently finds all three brackets for both categories
 * it's auto-applied. Cambio's pricing is a much larger package x category x
 * time-band x km-bracket matrix (some of it behind expandable sections),
 * which a text scan can't safely reconstruct unattended, so cron only
 * records that a check happened and leaves `needsReview` for a human to
 * reconcile via /admin.
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
    summary.degage = {
      confidenceA: degageScrape.categoryA.confidence,
      confidenceB: degageScrape.categoryB.confidence,
      notes: degageScrape.notes,
    };

    const bracketsA = degageScrape.categoryA.brackets;
    const bracketsB = degageScrape.categoryB.brackets;
    const aComplete = bracketsA.every((b) => b !== null);
    const bComplete = bracketsB.every((b) => b !== null);

    if (aComplete && bComplete && isPersistenceConfigured()) {
      current.degage = {
        ...current.degage,
        asOf: now.slice(0, 10),
        needsReview: false,
        categories: current.degage.categories.map((c) =>
          c.categoryId === "A"
            ? { ...c, kmBrackets: bracketsA.filter(isBracket) }
            : c.categoryId === "B"
              ? { ...c, kmBrackets: bracketsB.filter(isBracket) }
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

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
 * Both scrapers parse the sites' actual table markup rather than guessing
 * from plain text, so when a package/category comes back "complete" it's
 * auto-applied (persistence permitting). Anything incomplete is left alone
 * for a human to reconcile via /admin - the site's markup could always
 * change again.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data: fetched } = await getPricing();
  // Clone since `fetched` may be the shared SEED_PRICING module object when
  // no persistence is configured - mutating it in place would leak across
  // requests on the same warm serverless instance.
  const current = structuredClone(fetched);
  const now = new Date().toISOString();
  const summary: Record<string, unknown> = { checkedAt: now };
  const canPersist = isPersistenceConfigured();

  try {
    const cambioScrape = await scrapeCambio();
    summary.cambio = {
      confidence: cambioScrape.confidence,
      complete: cambioScrape.packages.filter((p) => p.complete).map((p) => p.packageId),
      notes: cambioScrape.notes,
    };

    if (canPersist) {
      let cambioUpdated = false;
      for (const scraped of cambioScrape.packages) {
        if (!scraped.complete || !scraped.packageId) continue;
        const pkg = current.cambio.packages.find((p) => p.id === scraped.packageId);
        if (!pkg) continue;
        pkg.monthlyFee = scraped.monthlyFee!;
        pkg.activationFee = scraped.activationFee!;
        for (const sr of scraped.rates) {
          const rate = pkg.rates.find((r) => r.categoryId === sr.categoryId);
          if (!rate) continue;
          rate.dayHourlyRate = sr.dayHourlyRate!;
          rate.nightHourlyRate = sr.nightHourlyRate!;
          rate.dayRate = sr.dayRate!;
          rate.weeklyRate = sr.weeklyRate!;
          rate.kmBrackets = [
            { uptoKm: 100, pricePerKm: sr.kmUnder100! },
            { uptoKm: null, pricePerKm: sr.kmOver100! },
          ];
        }
        cambioUpdated = true;
      }
      if (cambioUpdated) {
        current.cambio.asOf = now.slice(0, 10);
        current.cambio.needsReview = cambioScrape.packages.some((p) => !p.complete);
        summary.cambioUpdated = true;
      }
    }
  } catch (err) {
    summary.cambioError = err instanceof Error ? err.message : String(err);
  }

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

    if (aComplete && bComplete && canPersist) {
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

  current.lastAutoCheck = now;
  if (canPersist) {
    await savePricing(current);
  }

  return NextResponse.json(summary);
}

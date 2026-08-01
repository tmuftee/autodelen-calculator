import * as cheerio from "cheerio";
import { fetchHtml, parseEuroAmount, tableRows } from "./scrape-common";
import { CambioPackageId } from "./types";

export interface ScrapedCambioRate {
  categoryId: string; // S, M, L, XL
  dayHourlyRate: number | null;
  nightHourlyRate: number | null;
  dayRate: number | null;
  weeklyRate: number | null;
  kmUnder100: number | null;
  kmOver100: number | null;
}

export interface ScrapedCambioPackage {
  packageId: CambioPackageId | null;
  name: string;
  monthlyFee: number | null;
  activationFee: number | null;
  rates: ScrapedCambioRate[];
  complete: boolean;
}

export interface CambioScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  packages: ScrapedCambioPackage[];
  confidence: "low" | "medium" | "high";
  notes: string[];
}

const CLASS_ORDER = ["S", "M", "L", "XL"];

function matchPackageId(name: string): CambioPackageId | null {
  const lower = name.toLowerCase();
  if (lower.includes("start")) return "start";
  if (lower.includes("bonus")) return "bonus";
  if (lower.includes("comfort")) return "comfort";
  return null;
}

function classFromCaption(caption: string): string | null {
  // The site's own captions are inconsistent ("Class S" vs "Classe S"), so
  // tolerate an optional trailing "e" on "class".
  const match = /classe?\s+(S|M|L|XL)\b/i.exec(caption);
  return match ? match[1].toUpperCase() : null;
}

function emptyRate(categoryId: string): ScrapedCambioRate {
  return {
    categoryId,
    dayHourlyRate: null,
    nightHourlyRate: null,
    dayRate: null,
    weeklyRate: null,
    kmUnder100: null,
    kmOver100: null,
  };
}

function isRateComplete(r: ScrapedCambioRate): boolean {
  return (
    r.dayHourlyRate !== null &&
    r.nightHourlyRate !== null &&
    r.dayRate !== null &&
    r.weeklyRate !== null &&
    r.kmUnder100 !== null &&
    r.kmOver100 !== null
  );
}

function parsePackageBlock($: cheerio.CheerioAPI, block: cheerio.Cheerio<import("domhandler").AnyNode>): ScrapedCambioPackage {
  const name = $(block).find(".field--name-block-title h2").first().text().trim();
  let monthlyFee: number | null = null;
  let activationFee: number | null = null;
  const rateMap = new Map<string, ScrapedCambioRate>();
  let currentClass: string | null = null;

  $(block)
    .find(".field--name-field-table")
    .each((_, wrapperEl) => {
      const wrapper = $(wrapperEl);
      const table = wrapper.find("table.tablefield, table").first();
      if (!table.length) return;

      const caption = table.find("caption").text().trim();
      const detectedClass = classFromCaption(caption);
      if (detectedClass) currentClass = detectedClass;
      const isPackageLevelTable = !caption;

      for (const { label, value } of tableRows($, table)) {
        const amount = parseEuroAmount(value);
        if (amount === null) continue;

        if (isPackageLevelTable) {
          if (/monthly fee/i.test(label)) monthlyFee = amount;
          else if (/activation fee/i.test(label)) activationFee = amount;
          continue;
        }

        if (!currentClass) continue;
        if (!rateMap.has(currentClass)) rateMap.set(currentClass, emptyRate(currentClass));
        const rate = rateMap.get(currentClass)!;

        if (/night\s*hour\s*rate/i.test(label)) rate.nightHourlyRate = amount;
        else if (/hour\s*rate/i.test(label)) rate.dayHourlyRate = amount;
        else if (/kilometer\s*rate/i.test(label) && label.includes("<")) rate.kmUnder100 = amount;
        else if (/kilometer\s*rate/i.test(label) && label.includes(">")) rate.kmOver100 = amount;
        else if (/^(day|dag)\s*\(24/i.test(label)) rate.dayRate = amount;
        else if (/^week\s*\(7/i.test(label)) rate.weeklyRate = amount;
      }
    });

  const rates = CLASS_ORDER.filter((c) => rateMap.has(c)).map((c) => rateMap.get(c)!);
  const complete = monthlyFee !== null && activationFee !== null && rates.length === CLASS_ORDER.length && rates.every(isRateComplete);

  return { packageId: matchPackageId(name), name, monthlyFee, activationFee, rates, complete };
}

export function parseCambioHtml(html: string): { packages: ScrapedCambioPackage[]; notes: string[]; confidence: CambioScrapeResult["confidence"] } {
  const $ = cheerio.load(html);
  const notes: string[] = [];

  const blocks = $(".block-content--type-pricing");
  const packages = blocks.toArray().map((el) => parsePackageBlock($, $(el)));

  const completeCount = packages.filter((p) => p.complete).length;
  let confidence: CambioScrapeResult["confidence"] = "low";
  if (packages.length > 0 && completeCount > 0) confidence = "medium";
  if (packages.length >= 3 && completeCount === packages.length) confidence = "high";

  if (packages.length === 0) {
    notes.push(
      "Could not find any pricing blocks (.block-content--type-pricing) - the page layout may have changed."
    );
  } else if (completeCount < packages.length) {
    notes.push(
      `${completeCount}/${packages.length} packages parsed completely; the rest are missing at least one field - check them against the source before saving.`
    );
  }
  notes.push(
    "Parsed directly from the pricing tables' HTML structure. If cambio.be changes its markup this may silently miss fields - always spot-check a couple of numbers against the live page."
  );

  return { packages, confidence, notes };
}

export async function scrapeCambio(
  sourceUrl = "https://www.cambio.be/en-vla/how-much-does-it-cost"
): Promise<CambioScrapeResult> {
  const html = await fetchHtml(sourceUrl);
  const { packages, confidence, notes } = parseCambioHtml(html);
  return { sourceUrl, fetchedAt: new Date().toISOString(), packages, confidence, notes };
}

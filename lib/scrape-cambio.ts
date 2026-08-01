import { AmountMention, extractAmountMentions, fetchVisibleText, findNearby } from "./scrape-common";

export interface CambioScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  packagesDetected: string[];
  categoriesDetected: string[];
  hourlyAmounts: AmountMention[];
  kmAmounts: AmountMention[];
  dayAmounts: AmountMention[];
  monthlyAmounts: AmountMention[];
  packageExcerpts: Record<string, string[]>;
  confidence: "low" | "medium" | "high";
  notes: string[];
}

const PACKAGE_NAMES = ["Start", "Bonus", "Comfort", "Campus"];
const CATEGORY_HINTS = ["S", "A", "B", "C", "Break", "Combi", "Bus", "Van", "Kangoo"];

export async function scrapeCambio(
  sourceUrl = "https://www.cambio.be/en-vla/how-much-does-it-cost"
): Promise<CambioScrapeResult> {
  const text = await fetchVisibleText(sourceUrl);
  const notes: string[] = [];

  const packagesDetected = PACKAGE_NAMES.filter((name) =>
    new RegExp(`\\b${name}\\b`, "i").test(text)
  );
  const categoriesDetected = CATEGORY_HINTS.filter((cat) =>
    new RegExp(`\\b${cat}\\b`).test(text)
  );

  const mentions = extractAmountMentions(text);
  const hourlyAmounts = mentions.filter((m) => m.unit === "hour");
  const kmAmounts = mentions.filter((m) => m.unit === "km");
  const dayAmounts = mentions.filter((m) => m.unit === "day");
  const monthlyAmounts = mentions.filter((m) => m.unit === "month");

  const packageExcerpts: Record<string, string[]> = {};
  for (const pkg of packagesDetected) {
    packageExcerpts[pkg] = findNearby(text, new RegExp(`\\b${pkg}\\b`, "i"), 300).slice(0, 3);
  }

  let confidence: CambioScrapeResult["confidence"] = "low";
  if (packagesDetected.length >= 2 && hourlyAmounts.length > 0 && kmAmounts.length > 0) {
    confidence = "medium";
  }
  if (
    packagesDetected.length >= 3 &&
    hourlyAmounts.length >= 3 &&
    kmAmounts.length >= 3 &&
    categoriesDetected.length >= 2
  ) {
    confidence = "high";
  }

  if (packagesDetected.length === 0) {
    notes.push("Could not detect the Start / Bonus / Comfort package names on the page.");
  }
  if (hourlyAmounts.length === 0 || kmAmounts.length === 0) {
    notes.push("Could not find clearly-labelled per-hour and per-km amounts.");
  }
  notes.push(
    "This is a best-effort text scan, not a structured table parse - always verify against the source before saving."
  );

  return {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    packagesDetected,
    categoriesDetected,
    hourlyAmounts,
    kmAmounts,
    dayAmounts,
    monthlyAmounts,
    packageExcerpts,
    confidence,
    notes,
  };
}

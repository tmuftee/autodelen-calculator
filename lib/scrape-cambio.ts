import { AmountMention, extractAmountMentions, fetchVisibleText, findNearby } from "./scrape-common";

export interface CambioScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  packagesDetected: string[];
  categoriesDetected: string[];
  dayNightMentioned: boolean;
  km100BracketMentioned: boolean;
  weeklyRateMentioned: boolean;
  hourlyAmounts: AmountMention[];
  kmAmounts: AmountMention[];
  dayAmounts: AmountMention[];
  weekAmounts: AmountMention[];
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

  const dayNightMentioned = /\b(dag\s*\/?\s*nacht|day\s*\/?\s*night|06:00|6\s?u\b|00:00)/i.test(text);
  const km100BracketMentioned = /100\s*km/i.test(text);
  const weeklyRateMentioned = /\b(weektarief|weekprijs|weekly\s*rate|per\s*week|\/week)\b/i.test(text);

  const mentions = extractAmountMentions(text);
  const hourlyAmounts = mentions.filter((m) => m.unit === "hour");
  const kmAmounts = mentions.filter((m) => m.unit === "km");
  const dayAmounts = mentions.filter((m) => m.unit === "day");
  const monthlyAmounts = mentions.filter((m) => m.unit === "month");
  const weekAmounts = extractAmountMentions(text, 40).filter((m) =>
    /(per\s*week|\/week|weektarief|weekprijs)/i.test(m.context)
  );

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
  if (!dayNightMentioned) {
    notes.push("Could not confirm day/night rate split (06:00-24:00 vs 00:00-06:00) from the text.");
  }
  if (!km100BracketMentioned) {
    notes.push("Could not confirm the 100 km price-break point.");
  }
  if (!weeklyRateMentioned) {
    notes.push("Could not find a weekly-rate mention.");
  }
  notes.push(
    "Cambio's pricing tables include several tiers (day/night hourly, km brackets, day cap, weekly rate) and some are inside expandable sections that may only load via JavaScript - this is a plain-text scan of the fetched HTML, so it can miss content that isn't in the initial page load. Always verify each number against the live page before saving."
  );

  return {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    packagesDetected,
    categoriesDetected,
    dayNightMentioned,
    km100BracketMentioned,
    weeklyRateMentioned,
    hourlyAmounts,
    kmAmounts,
    dayAmounts,
    weekAmounts,
    monthlyAmounts,
    packageExcerpts,
    confidence,
    notes,
  };
}

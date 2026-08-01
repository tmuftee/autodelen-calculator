import { extractAmountMentions, fetchVisibleText, findNearby } from "./scrape-common";

export interface DegageScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  categoryAAmounts: number[];
  categoryBAmounts: number[];
  categoryAExcerpts: string[];
  categoryBExcerpts: string[];
  allKmAmounts: number[];
  confidence: "low" | "medium" | "high";
  suggestedCategoryA: number | null;
  suggestedCategoryB: number | null;
  notes: string[];
}

function bestGuess(amounts: number[]): number | null {
  if (amounts.length === 0) return null;
  // Plausible per-km carsharing price range; filters out unrelated euro amounts.
  const plausible = amounts.filter((a) => a >= 0.1 && a <= 2.5);
  const pool = plausible.length > 0 ? plausible : amounts;
  const counts = new Map<number, number>();
  for (const a of pool) counts.set(a, (counts.get(a) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function scrapeDegage(
  sourceUrl = "https://www.degage.be/de-prijzen/"
): Promise<DegageScrapeResult> {
  const text = await fetchVisibleText(sourceUrl);
  const notes: string[] = [];

  const categoryAExcerpts = findNearby(text, /categorie\s*a\b|category\s*a\b/i, 200);
  const categoryBExcerpts = findNearby(text, /categorie\s*b\b|category\s*b\b/i, 200);

  const categoryAAmounts = categoryAExcerpts.flatMap((ex) =>
    extractAmountMentions(ex).map((m) => m.amount)
  );
  const categoryBAmounts = categoryBExcerpts.flatMap((ex) =>
    extractAmountMentions(ex).map((m) => m.amount)
  );
  const allKmAmounts = extractAmountMentions(text)
    .filter((m) => m.unit === "km" || m.unit === "unknown")
    .map((m) => m.amount);

  const suggestedCategoryA = bestGuess(categoryAAmounts);
  const suggestedCategoryB = bestGuess(categoryBAmounts);

  let confidence: DegageScrapeResult["confidence"] = "low";
  if (suggestedCategoryA !== null && suggestedCategoryB !== null) {
    confidence = suggestedCategoryA !== suggestedCategoryB ? "high" : "medium";
  }

  if (categoryAExcerpts.length === 0 || categoryBExcerpts.length === 0) {
    notes.push("Could not find both 'Category A' and 'Category B' mentions on the page.");
  }
  notes.push(
    "This is a best-effort text scan, not a structured table parse - always verify against the source before saving."
  );

  return {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    categoryAAmounts,
    categoryBAmounts,
    categoryAExcerpts: categoryAExcerpts.slice(0, 3),
    categoryBExcerpts: categoryBExcerpts.slice(0, 3),
    allKmAmounts,
    confidence,
    suggestedCategoryA,
    suggestedCategoryB,
    notes,
  };
}

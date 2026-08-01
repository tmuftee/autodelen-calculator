import { fetchVisibleText, findNearby } from "./scrape-common";
import { KmBracket } from "./types";

export interface DegageCategoryScrape {
  brackets: (KmBracket | null)[]; // same order as BRACKET_LABELS; null = not found
  excerpt: string | null;
  confidence: "low" | "medium" | "high";
}

export interface DegageScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  categoryA: DegageCategoryScrape;
  categoryB: DegageCategoryScrape;
  notes: string[];
}

// Known table shape from degage.be/de-prijzen: "0-100 km", "100-200 km", "vanaf 201 km".
const BRACKET_LABELS: { pattern: RegExp; uptoKm: number | null }[] = [
  { pattern: /0\s*-\s*100\s*km/i, uptoKm: 100 },
  { pattern: /100\s*-\s*200\s*km/i, uptoKm: 200 },
  { pattern: /vanaf\s*20?1?\s*km|from\s*20?1?\s*km|>\s*200\s*km|200\s*\+\s*km/i, uptoKm: null },
];

const AMOUNT_AFTER_LABEL = /€\s?(\d{1,3}(?:[.,]\d{1,2})?)/;

function findAmountAfter(text: string, fromIndex: number, windowChars = 60): number | null {
  const slice = text.slice(fromIndex, fromIndex + windowChars);
  const match = AMOUNT_AFTER_LABEL.exec(slice);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function scrapeCategoryBrackets(excerpt: string | null): DegageCategoryScrape {
  if (!excerpt) return { brackets: [null, null, null], excerpt: null, confidence: "low" };

  const brackets = BRACKET_LABELS.map(({ pattern, uptoKm }) => {
    const match = pattern.exec(excerpt);
    if (!match) return null;
    const amount = findAmountAfter(excerpt, match.index + match[0].length);
    return amount !== null ? ({ uptoKm, pricePerKm: amount } satisfies KmBracket) : null;
  });

  const foundCount = brackets.filter(Boolean).length;
  const confidence: DegageCategoryScrape["confidence"] =
    foundCount === 3 ? "high" : foundCount >= 1 ? "medium" : "low";

  return { brackets, excerpt, confidence };
}

export async function scrapeDegage(
  sourceUrl = "https://www.degage.be/de-prijzen/"
): Promise<DegageScrapeResult> {
  const text = await fetchVisibleText(sourceUrl);
  const notes: string[] = [];

  const excerptsA = findNearby(text, /cat(?:egorie|egory)?\.?\s*a\b/i, 400);
  const excerptsB = findNearby(text, /cat(?:egorie|egory)?\.?\s*b\b/i, 400);

  const categoryA = scrapeCategoryBrackets(excerptsA[0] ?? null);
  const categoryB = scrapeCategoryBrackets(excerptsB[0] ?? null);

  if (categoryA.confidence !== "high" || categoryB.confidence !== "high") {
    notes.push(
      "Could not confidently find all three km brackets (0-100 / 100-200 / 200+) for both categories."
    );
  }
  notes.push(
    "This is a best-effort text scan, not a structured table parse - always verify against the source before saving."
  );

  return { sourceUrl, fetchedAt: new Date().toISOString(), categoryA, categoryB, notes };
}

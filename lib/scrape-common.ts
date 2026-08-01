import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export interface AmountMention {
  amount: number;
  context: string; // surrounding text, trimmed
  unit: "hour" | "km" | "day" | "month" | "unknown";
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en,nl;q=0.9,fr;q=0.8",
    },
    // Pricing pages change rarely; never serve a stale edge cache for an explicit update.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: HTTP ${res.status}`);
  }
  return res.text();
}

export async function fetchVisibleText(url: string): Promise<string> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const text = $("body").text();
  return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

/** Parses a euro amount out of arbitrary cell text, e.g. "€ 2.35 " -> 2.35. */
export function parseEuroAmount(value: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(value.replace(/€/g, ""));
  if (!match) return null;
  const amount = parseFloat(match[0].replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

/** Reads a two-column HTML table (thead + tbody rows) as [label, value] pairs. */
export function tableRows(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<AnyNode>
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  table.find("tr").each((_, tr) => {
    const cells = $(tr).find("th, td");
    if (cells.length < 2) return;
    const label = $(cells[0]).text().replace(/\s+/g, " ").trim();
    const value = $(cells[1]).text().replace(/\s+/g, " ").trim();
    if (label) rows.push({ label, value });
  });
  return rows;
}

const UNIT_PATTERNS: [RegExp, AmountMention["unit"]][] = [
  [/(per\s*uur|\/u\b|\/uur|per\s*hour|\/hr\b|\/hour)/i, "hour"],
  [/(per\s*km|\/km)/i, "km"],
  [/(per\s*dag|\/dag|per\s*day|\/day)/i, "day"],
  [/(per\s*maand|\/maand|per\s*month|\/month)/i, "month"],
];

/**
 * Best-effort extraction of "€X,XX <unit>" mentions from free text.
 * The two source sites are marketing pages whose markup can't be verified
 * from this environment, so this scans plain text with fairly loose
 * windows rather than relying on brittle CSS selectors.
 */
export function extractAmountMentions(text: string, windowChars = 40): AmountMention[] {
  const mentions: AmountMention[] = [];
  const amountRegex = /€\s?(\d{1,3}(?:[.,]\d{1,2})?)|(\d{1,3}(?:[.,]\d{1,2})?)\s?€/g;
  let match: RegExpExecArray | null;
  while ((match = amountRegex.exec(text)) !== null) {
    const raw = match[1] ?? match[2];
    const amount = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(amount)) continue;

    const start = Math.max(0, match.index - windowChars);
    const end = Math.min(text.length, match.index + match[0].length + windowChars);
    const context = text.slice(start, end).trim();

    let unit: AmountMention["unit"] = "unknown";
    for (const [pattern, u] of UNIT_PATTERNS) {
      if (pattern.test(context)) {
        unit = u;
        break;
      }
    }
    mentions.push({ amount, context, unit });
  }
  return mentions;
}

export function findNearby(text: string, needle: RegExp, windowChars = 250): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(needle.source, needle.flags.includes("g") ? needle.flags : needle.flags + "g");
  while ((match = re.exec(text)) !== null) {
    const start = Math.max(0, match.index - windowChars / 2);
    const end = Math.min(text.length, match.index + match[0].length + windowChars / 2);
    results.push(text.slice(start, end).trim());
  }
  return results;
}

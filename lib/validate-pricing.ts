import { PricingData } from "./types";

function isKmBracket(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (v.uptoKm === null || typeof v.uptoKm === "number") && typeof v.pricePerKm === "number";
}

function isKmBracketArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isKmBracket);
}

function isCambioCategoryRate(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.categoryId === "string" &&
    typeof v.dayHourlyRate === "number" &&
    typeof v.nightHourlyRate === "number" &&
    typeof v.dayRate === "number" &&
    typeof v.weeklyRate === "number" &&
    isKmBracketArray(v.kmBrackets)
  );
}

function isCambioPackage(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.monthlyFee === "number" &&
    typeof v.activationFee === "number" &&
    Array.isArray(v.rates) &&
    v.rates.length > 0 &&
    v.rates.every(isCambioCategoryRate)
  );
}

function isDegageCategoryRate(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.categoryId === "string" && typeof v.name === "string" && isKmBracketArray(v.kmBrackets);
}

/**
 * Strict-enough shape check for pricing data coming from an external
 * source (a saved KV/Upstash blob, or a POST body) - the schema has
 * changed shape more than once during development (flat hourlyRate ->
 * day/night rates, flat kmRate -> kmBrackets, etc.), so anything stored
 * under an older version of this app could silently be missing fields
 * the current calculator relies on. Rejecting mismatched data here means
 * the app falls back to the safe bundled seed instead of crashing on
 * `undefined.map(...)` deep in a calculation.
 */
export function isValidPricingData(value: unknown): value is PricingData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.lastUpdated !== "string") return false;

  const cambio = v.cambio as Record<string, unknown> | undefined;
  if (!cambio || !Array.isArray(cambio.categories) || !Array.isArray(cambio.packages)) return false;
  if (cambio.packages.length === 0 || !cambio.packages.every(isCambioPackage)) return false;

  const degage = v.degage as Record<string, unknown> | undefined;
  if (!degage || !Array.isArray(degage.categories)) return false;
  if (degage.categories.length === 0 || !degage.categories.every(isDegageCategoryRate)) return false;

  return true;
}

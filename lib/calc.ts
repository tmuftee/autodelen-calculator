import {
  CambioCalcInput,
  CambioCalcResult,
  CambioPricingData,
  DegageCalcInput,
  DegageCalcResult,
  DegagePricingData,
  KmBracket,
} from "./types";

export class CalcError extends Error {}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Round hours up to the nearest quarter hour, matching typical per-minute billing. */
function roundUpToQuarterHour(hours: number): number {
  return Math.ceil(hours * 4) / 4;
}

function kmCostFromBrackets(km: number, brackets: KmBracket[]): number {
  let remaining = km;
  let cost = 0;
  let lowerBound = 0;
  for (const bracket of brackets) {
    const upto = bracket.uptoKm ?? Infinity;
    const bracketSize = upto - lowerBound;
    const kmInBracket = Math.min(remaining, bracketSize);
    if (kmInBracket > 0) {
      cost += kmInBracket * bracket.pricePerKm;
      remaining -= kmInBracket;
    }
    lowerBound = upto;
    if (remaining <= 0) break;
  }
  return cost;
}

export function calculateCambio(
  input: CambioCalcInput,
  pricing: CambioPricingData
): CambioCalcResult {
  const pkg = pricing.packages.find((p) => p.id === input.packageId);
  if (!pkg) throw new CalcError(`Unknown Cambio package: ${input.packageId}`);

  const rate = pkg.rates.find((r) => r.categoryId === input.categoryId);
  if (!rate) {
    throw new CalcError(
      `No rate found for category ${input.categoryId} in package ${input.packageId}`
    );
  }

  const start = new Date(input.start);
  const end = new Date(input.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new CalcError("Invalid start or end date/time");
  }
  if (end <= start) {
    throw new CalcError("End date/time must be after start date/time");
  }
  if (!Number.isFinite(input.km) || input.km < 0) {
    throw new CalcError("Kilometers must be a non-negative number");
  }

  const rawHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const billedHours = roundUpToQuarterHour(rawHours);

  const days = Math.floor(billedHours / 24);
  const remainderHours = roundTo(billedHours - days * 24, 2);

  const fullDaysCost = days * rate.dayRate;
  const remainderCost = Math.min(remainderHours * rate.hourlyRate, rate.dayRate);
  const timeCost = roundTo(fullDaysCost + remainderCost);

  const kmCost = roundTo(
    rate.kmBrackets && rate.kmBrackets.length > 0
      ? kmCostFromBrackets(input.km, rate.kmBrackets)
      : input.km * rate.kmRate
  );

  const total = roundTo(timeCost + kmCost);
  const effectiveKmRate = input.km > 0 ? roundTo(kmCost / input.km, 3) : rate.kmRate;

  return {
    hours: roundTo(rawHours, 2),
    billedHours,
    days,
    timeCost,
    kmCost,
    total,
    monthlyFee: pkg.monthlyFee,
    hourlyRate: rate.hourlyRate,
    dayRate: rate.dayRate,
    effectiveKmRate,
  };
}

export function calculateDegage(
  input: DegageCalcInput,
  pricing: DegagePricingData
): DegageCalcResult {
  const rate = pricing.categories.find((c) => c.categoryId === input.categoryId);
  if (!rate) throw new CalcError(`Unknown Dégage category: ${input.categoryId}`);
  if (!Number.isFinite(input.km) || input.km < 0) {
    throw new CalcError("Kilometers must be a non-negative number");
  }

  const total = roundTo(input.km * rate.pricePerKm);
  return { km: input.km, pricePerKm: rate.pricePerKm, total };
}

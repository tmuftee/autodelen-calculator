import {
  CambioCalcInput,
  CambioCalcResult,
  CambioDaySegment,
  CambioPricingData,
  DegageCalcInput,
  DegageCalcResult,
  DegagePricingData,
  KmBracket,
} from "./types";

export class CalcError extends Error {}

const NIGHT_BAND_END_HOUR = 6; // 00:00-06:00 is the night band, 06:00-24:00 is the day band

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Round hours up to the nearest quarter hour, matching typical per-minute billing. */
function roundUpToQuarterHour(hours: number): number {
  return Math.ceil(hours * 4) / 4;
}

/** Marginal/tiered km cost: km within each bracket are billed at that bracket's rate. */
export function kmCostFromBrackets(km: number, brackets: KmBracket[]): number {
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

function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Splits [start, end) into per-calendar-day (local time) segments, each with
 * the hours falling in the night band (00:00-06:00) and day band
 * (06:00-24:00), since Cambio's hourly rate depends on time of day.
 */
function splitByCalendarDayAndBand(
  start: Date,
  end: Date
): { date: string; dayHours: number; nightHours: number }[] {
  const segments: { date: string; dayHours: number; nightHours: number }[] = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const calendarDayStart = new Date(cursor);
    calendarDayStart.setHours(0, 0, 0, 0);
    const nextMidnight = new Date(calendarDayStart);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    const segmentEnd = end < nextMidnight ? end : nextMidnight;

    const nightBandEnd = new Date(calendarDayStart);
    nightBandEnd.setHours(NIGHT_BAND_END_HOUR, 0, 0, 0);

    const nightPortionEnd = segmentEnd < nightBandEnd ? segmentEnd : nightBandEnd;
    const nightHoursMs = Math.max(0, nightPortionEnd.getTime() - cursor.getTime());

    const dayPortionStart = cursor > nightBandEnd ? cursor : nightBandEnd;
    const dayHoursMs = Math.max(0, segmentEnd.getTime() - dayPortionStart.getTime());

    segments.push({
      date: dateKey(calendarDayStart),
      nightHours: nightHoursMs / (1000 * 60 * 60),
      dayHours: dayHoursMs / (1000 * 60 * 60),
    });

    cursor = segmentEnd;
  }

  return segments;
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
  const billedEnd = new Date(start.getTime() + billedHours * 60 * 60 * 1000);

  const rawSegments = splitByCalendarDayAndBand(start, billedEnd);
  const days: CambioDaySegment[] = rawSegments.map((seg) => {
    const rawCost = seg.dayHours * rate.dayHourlyRate + seg.nightHours * rate.nightHourlyRate;
    return { ...seg, cost: roundTo(Math.min(rawCost, rate.dayRate)) };
  });

  const dailySum = roundTo(days.reduce((sum, d) => sum + d.cost, 0));

  // A run of 7 consecutive calendar days can instead be billed at the flat
  // weekly rate when that is cheaper than 7 individually-capped days.
  let timeCost = dailySum;
  let weeklyRateApplied = false;
  if (rate.weeklyRate > 0 && days.length >= 7) {
    const fullWeeks = Math.floor(days.length / 7);
    const remainderDays = days.slice(fullWeeks * 7);
    const remainderCost = remainderDays.reduce((sum, d) => sum + d.cost, 0);
    const weeklyAltCost = roundTo(fullWeeks * rate.weeklyRate + remainderCost);
    if (weeklyAltCost < timeCost) {
      timeCost = weeklyAltCost;
      weeklyRateApplied = true;
    }
  }

  const kmCost = roundTo(kmCostFromBrackets(input.km, rate.kmBrackets));
  const total = roundTo(timeCost + kmCost);
  const effectiveKmRate =
    input.km > 0 ? roundTo(kmCost / input.km, 3) : rate.kmBrackets[0]?.pricePerKm ?? 0;

  return {
    hours: roundTo(rawHours, 2),
    billedHours,
    days,
    weeklyRateApplied,
    timeCost,
    kmCost,
    total,
    monthlyFee: pkg.monthlyFee,
    activationFee: pkg.activationFee,
    dayHourlyRate: rate.dayHourlyRate,
    nightHourlyRate: rate.nightHourlyRate,
    dayRate: rate.dayRate,
    weeklyRate: rate.weeklyRate,
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

  const kmCost = roundTo(kmCostFromBrackets(input.km, rate.kmBrackets));
  const effectiveKmRate = input.km > 0 ? roundTo(kmCost / input.km, 3) : rate.kmBrackets[0]?.pricePerKm ?? 0;
  return { km: input.km, kmCost, total: kmCost, effectiveKmRate };
}

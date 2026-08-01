export type CambioPackageId = "start" | "bonus" | "comfort";

export interface CarCategory {
  id: string;
  name: string;
  description?: string;
}

export interface KmBracket {
  uptoKm: number | null; // null = unbounded (last bracket)
  pricePerKm: number;
}

export interface CambioCategoryRate {
  categoryId: string;
  dayHourlyRate: number; // EUR per hour, 06:00-24:00
  nightHourlyRate: number; // EUR per hour, 00:00-06:00
  dayRate: number; // EUR cap on the time-based cost for a single calendar day
  weeklyRate: number; // EUR cap for a full 7 consecutive calendar days
  kmBrackets: KmBracket[]; // tiered km pricing, e.g. 0-100km then 100km+
}

export interface CambioPackagePricing {
  id: CambioPackageId;
  name: string;
  monthlyFee: number; // EUR/month subscription fee (informational, not part of a single trip cost)
  rates: CambioCategoryRate[];
}

export interface CambioPricingData {
  categories: CarCategory[];
  packages: CambioPackagePricing[];
  asOf: string; // ISO date the numbers were last confirmed against the source
  source: string;
  needsReview?: boolean;
}

export type DegageCategoryId = "A" | "B";

export interface DegageCategoryRate {
  categoryId: DegageCategoryId;
  name: string;
  description?: string;
  kmBrackets: KmBracket[]; // tiered km pricing, e.g. 0-100 / 100-200 / 200+, fuel included
}

export interface DegagePricingData {
  categories: DegageCategoryRate[];
  asOf: string;
  source: string;
  needsReview?: boolean;
}

export interface PricingData {
  cambio: CambioPricingData;
  degage: DegagePricingData;
  lastUpdated: string; // ISO timestamp of the last successful update (scrape or manual edit)
  lastAutoCheck?: string; // ISO timestamp of the last automated (cron) scrape attempt
}

export interface CambioCalcInput {
  packageId: CambioPackageId;
  categoryId: string;
  start: string; // ISO datetime-local
  end: string; // ISO datetime-local
  km: number;
}

export interface CambioDaySegment {
  date: string; // YYYY-MM-DD, local calendar day
  dayHours: number; // hours billed at the 06:00-24:00 rate
  nightHours: number; // hours billed at the 00:00-06:00 rate
  cost: number; // capped at dayRate
}

export interface CambioCalcResult {
  hours: number;
  billedHours: number; // rounded up to nearest 15 min
  days: CambioDaySegment[];
  weeklyRateApplied: boolean;
  timeCost: number;
  kmCost: number;
  total: number;
  monthlyFee: number;
  dayHourlyRate: number;
  nightHourlyRate: number;
  dayRate: number;
  weeklyRate: number;
  effectiveKmRate: number;
}

export interface DegageCalcInput {
  categoryId: DegageCategoryId;
  km: number;
}

export interface DegageCalcResult {
  km: number;
  kmCost: number;
  total: number;
  effectiveKmRate: number;
}

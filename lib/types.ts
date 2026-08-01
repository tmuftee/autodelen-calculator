export type CambioPackageId = "start" | "bonus" | "comfort";

export interface CarCategory {
  id: string;
  name: string;
  description?: string;
}

export interface CambioCategoryRate {
  categoryId: string;
  hourlyRate: number; // EUR per hour
  dayRate: number; // EUR per day (cap on the time-based cost for a full 24h block)
  kmRate: number; // EUR per km (flat, used when no brackets are defined)
  kmBrackets?: KmBracket[]; // optional tiered km pricing, overrides kmRate when present
}

export interface KmBracket {
  uptoKm: number | null; // null = unbounded (last bracket)
  pricePerKm: number;
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
  pricePerKm: number; // EUR per km, fuel included
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

export interface CambioCalcResult {
  hours: number;
  billedHours: number; // rounded up to nearest 15 min
  days: number;
  timeCost: number;
  kmCost: number;
  total: number;
  monthlyFee: number;
  hourlyRate: number;
  dayRate: number;
  effectiveKmRate: number;
}

export interface DegageCalcInput {
  categoryId: DegageCategoryId;
  km: number;
}

export interface DegageCalcResult {
  km: number;
  pricePerKm: number;
  total: number;
}

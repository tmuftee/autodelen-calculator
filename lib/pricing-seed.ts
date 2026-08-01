import { PricingData } from "./types";

/**
 * Bootstrap pricing data shipped with the app.
 *
 * These numbers are placeholders so the calculator works out of the box.
 * They are NOT guaranteed to match the current published rates. Use the
 * "Update pricing" screen (/admin) once the app is deployed to fetch and
 * review the live numbers from cambio.be and degage.be, since this build
 * environment has no outbound access to those sites to confirm them.
 */
export const SEED_PRICING: PricingData = {
  cambio: {
    asOf: "2026-08-01",
    source: "https://www.cambio.be/en-vla/how-much-does-it-cost",
    needsReview: true,
    categories: [
      { id: "S", name: "Compact", description: "Small city car" },
      { id: "A", name: "Medium", description: "Family hatchback / sedan" },
      { id: "Break", name: "Estate / Break", description: "Estate car, extra luggage space" },
      { id: "Bus", name: "Van / Bus", description: "Van for moving or groups" },
    ],
    packages: [
      {
        id: "start",
        name: "Start",
        monthlyFee: 0,
        rates: [
          { categoryId: "S", hourlyRate: 2.4, dayRate: 33, kmRate: 0.34 },
          { categoryId: "A", hourlyRate: 2.8, dayRate: 38, kmRate: 0.36 },
          { categoryId: "Break", hourlyRate: 3.2, dayRate: 43, kmRate: 0.38 },
          { categoryId: "Bus", hourlyRate: 3.8, dayRate: 55, kmRate: 0.42 },
        ],
      },
      {
        id: "bonus",
        name: "Bonus",
        monthlyFee: 15,
        rates: [
          { categoryId: "S", hourlyRate: 2.0, dayRate: 29, kmRate: 0.31 },
          { categoryId: "A", hourlyRate: 2.35, dayRate: 33, kmRate: 0.33 },
          { categoryId: "Break", hourlyRate: 2.7, dayRate: 38, kmRate: 0.35 },
          { categoryId: "Bus", hourlyRate: 3.2, dayRate: 48, kmRate: 0.39 },
        ],
      },
      {
        id: "comfort",
        name: "Comfort",
        monthlyFee: 35,
        rates: [
          { categoryId: "S", hourlyRate: 1.6, dayRate: 25, kmRate: 0.28 },
          { categoryId: "A", hourlyRate: 1.9, dayRate: 28, kmRate: 0.3 },
          { categoryId: "Break", hourlyRate: 2.2, dayRate: 33, kmRate: 0.32 },
          { categoryId: "Bus", hourlyRate: 2.7, dayRate: 42, kmRate: 0.36 },
        ],
      },
    ],
  },
  degage: {
    asOf: "2026-08-01",
    source: "https://www.degage.be/de-prijzen/",
    needsReview: true,
    categories: [
      { categoryId: "A", name: "Category A", description: "Compact / economical car", pricePerKm: 0.34 },
      { categoryId: "B", name: "Category B", description: "Larger / estate car", pricePerKm: 0.38 },
    ],
  },
  lastUpdated: "2026-08-01T00:00:00.000Z",
};

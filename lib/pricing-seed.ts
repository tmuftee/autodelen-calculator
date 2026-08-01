import { PricingData } from "./types";

/**
 * Bootstrap pricing data shipped with the app.
 *
 * Cambio's numbers are placeholders so the calculator works out of the box
 * - they are NOT guaranteed to match the current published rates. Use the
 * "Update pricing" screen (/admin) once the app is deployed to fetch and
 * review the live numbers from cambio.be, since this build environment has
 * no outbound access to that site to confirm them.
 *
 * Dégage's km-bracket prices below were supplied directly (not scraped) and
 * are treated as confirmed as of `asOf`.
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
    // Placeholder assumptions pending review against the live site:
    //  - nightHourlyRate ~= 60% of dayHourlyRate (00:00-06:00 vs 06:00-24:00)
    //  - km price drops after the first 100 km
    //  - weeklyRate ~= 5x dayRate (flat cap for a full 7-day block, applied
    //    only when cheaper than 7 individually-capped days)
    packages: [
      {
        id: "start",
        name: "Start",
        monthlyFee: 0,
        rates: [
          {
            categoryId: "S",
            dayHourlyRate: 2.4,
            nightHourlyRate: 1.4,
            dayRate: 33,
            weeklyRate: 165,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.34 },
              { uptoKm: null, pricePerKm: 0.3 },
            ],
          },
          {
            categoryId: "A",
            dayHourlyRate: 2.8,
            nightHourlyRate: 1.7,
            dayRate: 38,
            weeklyRate: 190,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.36 },
              { uptoKm: null, pricePerKm: 0.32 },
            ],
          },
          {
            categoryId: "Break",
            dayHourlyRate: 3.2,
            nightHourlyRate: 1.9,
            dayRate: 43,
            weeklyRate: 215,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.38 },
              { uptoKm: null, pricePerKm: 0.34 },
            ],
          },
          {
            categoryId: "Bus",
            dayHourlyRate: 3.8,
            nightHourlyRate: 2.3,
            dayRate: 55,
            weeklyRate: 275,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.42 },
              { uptoKm: null, pricePerKm: 0.37 },
            ],
          },
        ],
      },
      {
        id: "bonus",
        name: "Bonus",
        monthlyFee: 15,
        rates: [
          {
            categoryId: "S",
            dayHourlyRate: 2.0,
            nightHourlyRate: 1.2,
            dayRate: 29,
            weeklyRate: 145,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.31 },
              { uptoKm: null, pricePerKm: 0.27 },
            ],
          },
          {
            categoryId: "A",
            dayHourlyRate: 2.35,
            nightHourlyRate: 1.4,
            dayRate: 33,
            weeklyRate: 165,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.33 },
              { uptoKm: null, pricePerKm: 0.29 },
            ],
          },
          {
            categoryId: "Break",
            dayHourlyRate: 2.7,
            nightHourlyRate: 1.6,
            dayRate: 38,
            weeklyRate: 190,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.35 },
              { uptoKm: null, pricePerKm: 0.31 },
            ],
          },
          {
            categoryId: "Bus",
            dayHourlyRate: 3.2,
            nightHourlyRate: 1.9,
            dayRate: 48,
            weeklyRate: 240,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.39 },
              { uptoKm: null, pricePerKm: 0.35 },
            ],
          },
        ],
      },
      {
        id: "comfort",
        name: "Comfort",
        monthlyFee: 35,
        rates: [
          {
            categoryId: "S",
            dayHourlyRate: 1.6,
            nightHourlyRate: 1.0,
            dayRate: 25,
            weeklyRate: 125,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.28 },
              { uptoKm: null, pricePerKm: 0.24 },
            ],
          },
          {
            categoryId: "A",
            dayHourlyRate: 1.9,
            nightHourlyRate: 1.1,
            dayRate: 28,
            weeklyRate: 140,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.3 },
              { uptoKm: null, pricePerKm: 0.26 },
            ],
          },
          {
            categoryId: "Break",
            dayHourlyRate: 2.2,
            nightHourlyRate: 1.3,
            dayRate: 33,
            weeklyRate: 165,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.32 },
              { uptoKm: null, pricePerKm: 0.28 },
            ],
          },
          {
            categoryId: "Bus",
            dayHourlyRate: 2.7,
            nightHourlyRate: 1.6,
            dayRate: 42,
            weeklyRate: 210,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.36 },
              { uptoKm: null, pricePerKm: 0.32 },
            ],
          },
        ],
      },
    ],
  },
  degage: {
    asOf: "2026-08-01",
    source: "https://www.degage.be/de-prijzen/",
    needsReview: false,
    categories: [
      {
        categoryId: "A",
        name: "Category A",
        description: "Compact / economical car",
        kmBrackets: [
          { uptoKm: 100, pricePerKm: 0.44 },
          { uptoKm: 200, pricePerKm: 0.4 },
          { uptoKm: null, pricePerKm: 0.36 },
        ],
      },
      {
        categoryId: "B",
        name: "Category B",
        description: "Larger / estate car",
        kmBrackets: [
          { uptoKm: 100, pricePerKm: 0.52 },
          { uptoKm: 200, pricePerKm: 0.48 },
          { uptoKm: null, pricePerKm: 0.44 },
        ],
      },
    ],
  },
  lastUpdated: "2026-08-01T00:00:00.000Z",
};

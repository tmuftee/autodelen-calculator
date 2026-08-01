import { PricingData } from "./types";

/**
 * Bootstrap pricing data shipped with the app.
 *
 * Cambio's numbers below are transcribed from the pricing tables on
 * cambio.be/en-vla/how-much-does-it-cost (Start/Bonus/Comfort x S/M/L/XL),
 * including the day/night hourly split, the 100 km price break, the day
 * cap, and the weekly cap. Dégage's km-bracket prices were supplied
 * directly from degage.be/de-prijzen. Both are treated as confirmed as of
 * `asOf` - re-run "Update pricing" on /admin periodically to catch changes.
 */
export const SEED_PRICING: PricingData = {
  cambio: {
    asOf: "2026-08-01",
    source: "https://www.cambio.be/en-vla/how-much-does-it-cost",
    needsReview: false,
    categories: [
      { id: "S", name: "Class S", description: "Standard city car" },
      { id: "M", name: "Class M", description: "More comfort" },
      { id: "L", name: "Class L", description: "More space - breaks and minivans" },
      { id: "XL", name: "Class XL", description: "Monovolume / van" },
    ],
    packages: [
      {
        id: "start",
        name: "Start",
        monthlyFee: 4,
        activationFee: 35,
        rates: [
          {
            categoryId: "S",
            dayHourlyRate: 2.35,
            nightHourlyRate: 0.5,
            dayRate: 28,
            weeklyRate: 168,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.41 },
              { uptoKm: null, pricePerKm: 0.32 },
            ],
          },
          {
            categoryId: "M",
            dayHourlyRate: 2.95,
            nightHourlyRate: 0.5,
            dayRate: 35.5,
            weeklyRate: 213,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.43 },
              { uptoKm: null, pricePerKm: 0.33 },
            ],
          },
          {
            categoryId: "L",
            dayHourlyRate: 3.5,
            nightHourlyRate: 1,
            dayRate: 40,
            weeklyRate: 240,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.45 },
              { uptoKm: null, pricePerKm: 0.35 },
            ],
          },
          {
            categoryId: "XL",
            dayHourlyRate: 4.8,
            nightHourlyRate: 1,
            dayRate: 58,
            weeklyRate: 348,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.51 },
              { uptoKm: null, pricePerKm: 0.38 },
            ],
          },
        ],
      },
      {
        id: "bonus",
        name: "Bonus",
        monthlyFee: 8,
        activationFee: 35,
        rates: [
          {
            categoryId: "S",
            dayHourlyRate: 2.1,
            nightHourlyRate: 0.5,
            dayRate: 25,
            weeklyRate: 150,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.32 },
              { uptoKm: null, pricePerKm: 0.3 },
            ],
          },
          {
            categoryId: "M",
            dayHourlyRate: 2.45,
            nightHourlyRate: 0.5,
            dayRate: 29.5,
            weeklyRate: 177,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.34 },
              { uptoKm: null, pricePerKm: 0.32 },
            ],
          },
          {
            categoryId: "L",
            dayHourlyRate: 2.8,
            nightHourlyRate: 1,
            dayRate: 32,
            weeklyRate: 192,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.38 },
              { uptoKm: null, pricePerKm: 0.33 },
            ],
          },
          {
            categoryId: "XL",
            dayHourlyRate: 4.1,
            nightHourlyRate: 1,
            dayRate: 49.5,
            weeklyRate: 297,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.45 },
              { uptoKm: null, pricePerKm: 0.36 },
            ],
          },
        ],
      },
      {
        id: "comfort",
        name: "Comfort",
        monthlyFee: 22,
        activationFee: 35,
        rates: [
          {
            categoryId: "S",
            dayHourlyRate: 1.85,
            nightHourlyRate: 0.5,
            dayRate: 22,
            weeklyRate: 132,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.29 },
              { uptoKm: null, pricePerKm: 0.26 },
            ],
          },
          {
            categoryId: "M",
            dayHourlyRate: 2.25,
            nightHourlyRate: 0.5,
            dayRate: 27,
            weeklyRate: 162,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.31 },
              { uptoKm: null, pricePerKm: 0.27 },
            ],
          },
          {
            categoryId: "L",
            dayHourlyRate: 2.5,
            nightHourlyRate: 1,
            dayRate: 29,
            weeklyRate: 174,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.32 },
              { uptoKm: null, pricePerKm: 0.28 },
            ],
          },
          {
            categoryId: "XL",
            dayHourlyRate: 3.3,
            nightHourlyRate: 1,
            dayRate: 40,
            weeklyRate: 240,
            kmBrackets: [
              { uptoKm: 100, pricePerKm: 0.38 },
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

import { NextRequest, NextResponse } from "next/server";
import { getPricing, isPersistenceConfigured, savePricing } from "@/lib/pricing-store";
import { PricingData } from "@/lib/types";

export async function GET() {
  const { data, persisted } = await getPricing();
  return NextResponse.json({
    data,
    persisted,
    persistenceConfigured: isPersistenceConfigured(),
  });
}

function isValidPricingData(value: unknown): value is PricingData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!v.cambio || !v.degage || typeof v.lastUpdated !== "string") return false;
  const cambio = v.cambio as Record<string, unknown>;
  const degage = v.degage as Record<string, unknown>;
  return Array.isArray(cambio.packages) && Array.isArray(cambio.categories) && Array.isArray(degage.categories);
}

export async function POST(req: NextRequest) {
  if (!isPersistenceConfigured()) {
    return NextResponse.json(
      {
        error:
          "No persistence configured. Set KV_REST_API_URL / KV_REST_API_TOKEN (Vercel KV / Upstash Redis) to enable saving pricing updates.",
      },
      { status: 501 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidPricingData(body)) {
    return NextResponse.json({ error: "Payload does not match expected pricing data shape" }, { status: 400 });
  }

  const result = await savePricing(body);
  return NextResponse.json(result);
}

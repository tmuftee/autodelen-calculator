import { NextRequest, NextResponse } from "next/server";
import { getPricing, isPersistenceConfigured, savePricing } from "@/lib/pricing-store";
import { isValidPricingData } from "@/lib/validate-pricing";

export async function GET() {
  const { data, persisted } = await getPricing();
  return NextResponse.json({
    data,
    persisted,
    persistenceConfigured: isPersistenceConfigured(),
  });
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
  if (!result.saved) {
    return NextResponse.json({ saved: false, error: result.error ?? "Failed to save pricing." }, { status: 502 });
  }
  return NextResponse.json(result);
}

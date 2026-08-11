import { PricingData } from "./types";
import { SEED_PRICING } from "./pricing-seed";
import { isValidPricingData } from "./validate-pricing";

const STORE_KEY = "autodelen:pricing";

function restUrl(): string | undefined {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
}

function restToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
}

/**
 * Persistence is optional: if a Vercel KV / Upstash Redis REST endpoint is
 * configured via env vars, pricing updates are saved there and shared by
 * every visitor and every serverless instance. Without it, the app still
 * works fine using the bundled seed data - "Update pricing" will fetch and
 * display live numbers, but won't be able to persist them (Vercel's
 * serverless filesystem is read-only/ephemeral at runtime).
 */
export function isPersistenceConfigured(): boolean {
  return Boolean(restUrl() && restToken());
}

interface RawRead {
  found: boolean;
  parsed: unknown;
  debugType: string;
  debugSample: string;
}

/**
 * Fetches the raw stored value and JSON.parses it up to twice - REST KV
 * APIs vary on whether a POSTed JSON body is stored as-is or re-encoded,
 * so this tolerates either a singly- or doubly-encoded value rather than
 * assuming one specific wire format.
 */
async function kvGetRaw(): Promise<RawRead> {
  const url = restUrl();
  const token = restToken();
  if (!url || !token) return { found: false, parsed: undefined, debugType: "unconfigured", debugSample: "" };

  const res = await fetch(`${url}/get/${STORE_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { found: false, parsed: undefined, debugType: `http-${res.status}`, debugSample: "" };

  const body = (await res.json()) as { result: unknown };
  if (body.result === null || body.result === undefined) {
    return { found: false, parsed: undefined, debugType: "null", debugSample: "" };
  }

  let value: unknown = body.result;
  for (let i = 0; i < 2 && typeof value === "string"; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }

  const debugSample = JSON.stringify(value).slice(0, 300);
  return { found: true, parsed: value, debugType: typeof value, debugSample };
}

async function kvGet(): Promise<PricingData | null> {
  const { parsed } = await kvGetRaw();
  // Stored data may predate a schema change (e.g. saved by an older
  // deploy) - never trust it blindly, fall back to the seed instead of
  // crashing the app on a missing field.
  return isValidPricingData(parsed) ? parsed : null;
}

async function kvSet(data: PricingData): Promise<{ ok: boolean; error?: string }> {
  const url = restUrl();
  const token = restToken();
  if (!url || !token) return { ok: false, error: "Persistence not configured" };

  try {
    const res = await fetch(`${url}/set/${STORE_KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `KV write failed: HTTP ${res.status} ${body}`.trim() };
    }

    // Verify the round-trip actually reads back as valid data instead of
    // trusting a 200 from the write alone - a REST wire-format mismatch
    // would otherwise report success while storing something unreadable.
    const readBack = await kvGetRaw();
    if (!isValidPricingData(readBack.parsed)) {
      return {
        ok: false,
        error: `KV write returned OK but read-back didn't validate (parsed as ${readBack.debugType}: ${readBack.debugSample})`,
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `KV write failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function getPricing(): Promise<{ data: PricingData; persisted: boolean }> {
  if (isPersistenceConfigured()) {
    const stored = await kvGet();
    if (stored) return { data: stored, persisted: true };
  }
  return { data: SEED_PRICING, persisted: false };
}

export async function savePricing(data: PricingData): Promise<{ saved: boolean; error?: string }> {
  if (!isPersistenceConfigured()) return { saved: false, error: "Persistence not configured" };
  const result = await kvSet(data);
  return { saved: result.ok, error: result.error };
}

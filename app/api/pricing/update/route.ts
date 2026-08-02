import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { scrapeCambio } from "@/lib/scrape-cambio";
import { scrapeDegage } from "@/lib/scrape-degage";

/**
 * Fetches the current live pricing pages and returns a best-effort parse
 * for an admin to review. This never persists anything by itself - see
 * POST /api/pricing to save reviewed values.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [cambioResult, degageResult] = await Promise.allSettled([scrapeCambio(), scrapeDegage()]);

  return NextResponse.json({
    cambio:
      cambioResult.status === "fulfilled"
        ? cambioResult.value
        : { error: cambioResult.reason?.message ?? "Failed to fetch cambio.be" },
    degage:
      degageResult.status === "fulfilled"
        ? degageResult.value
        : { error: degageResult.reason?.message ?? "Failed to fetch degage.be" },
  });
}

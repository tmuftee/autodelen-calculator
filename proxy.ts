import { NextRequest, NextResponse } from "next/server";

const REALM = "Pricing admin";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}"` },
  });
}

/**
 * Gates the pricing admin UI and its write/scrape endpoints behind HTTP
 * Basic Auth so only whoever knows ADMIN_PASSWORD can change pricing.
 * GET /api/pricing stays open - the public calculator needs it to load
 * current prices for every visitor.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isProtectedApi =
    (pathname === "/api/pricing" && req.method !== "GET") || pathname === "/api/pricing/update";

  if (!isAdminPage && !isProtectedApi) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse(
      "Pricing admin is disabled: set the ADMIN_PASSWORD environment variable to enable it.",
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return unauthorized();
  }
  // Only the password matters - any username is accepted.
  const suppliedPassword = decoded.slice(decoded.indexOf(":") + 1);

  if (!timingSafeEqual(suppliedPassword, password)) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/pricing", "/api/pricing/update"],
};

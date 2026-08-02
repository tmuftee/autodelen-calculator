import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, expectedAdminToken, sha256Hex, verifyAdminToken } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  const expected = await expectedAdminToken();
  if (!expected) {
    return NextResponse.redirect(new URL("/admin?error=disabled", req.url));
  }

  const suppliedToken = await sha256Hex(password);
  if (!(await verifyAdminToken(suppliedToken))) {
    return NextResponse.redirect(new URL("/admin?error=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

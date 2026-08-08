import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, getSecret, verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isRoot = pathname === "/";

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await verifyToken(token, getSecret());

  if (pathname === "/admin/login") {
    if (ok) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }

  if (isRoot) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isAdmin) {
    if (ok) return NextResponse.next();
    const url = new URL("/admin/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/"],
};
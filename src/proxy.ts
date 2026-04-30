import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((req) => {
  const requestHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const requestProtocol = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const requestOrigin = `${requestProtocol}://${requestHost}`;
  const isAuthenticated = !!req.auth;
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/admin1") ||
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/components") ||
    req.nextUrl.pathname.startsWith("/delivery") ||
    req.nextUrl.pathname.startsWith("/financial") ||
    req.nextUrl.pathname.startsWith("/inventory") ||
    req.nextUrl.pathname.startsWith("/profile") ||
    req.nextUrl.pathname.startsWith("/providers") ||
    req.nextUrl.pathname.startsWith("/reports") ||
    req.nextUrl.pathname.startsWith("/sales") ||
    req.nextUrl.pathname.startsWith("/users") ||
    req.nextUrl.pathname.startsWith("/wholesale");

  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/login", requestOrigin);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", requestOrigin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin1/:path*",
    "/dashboard/:path*",
    "/components/:path*",
    "/delivery/:path*",
    "/financial/:path*",
    "/inventory/:path*",
    "/profile/:path*",
    "/providers/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/login",
    "/users/:path*",
    "/wholesale/:path*",
  ],
};

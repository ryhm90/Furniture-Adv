import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function proxy(req) {
    const token = req.nextauth.token;
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

    if (!token && isProtectedRoute) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set(
        "callbackUrl",
        `${req.nextUrl.pathname}${req.nextUrl.search}`,
      );
      return NextResponse.redirect(loginUrl);
    }

    if (token && (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/login")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname === "/login") {
          return true;
        }

        return !!token;
      },
    },
  },
);

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

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const AUTH_BYPASS_FOR_E2E = process.env.PLAYWRIGHT_AUTH_BYPASS === "true";

// Reuse the same authorization logic as the previous middleware but expose
// it as a `proxy` as recommended by Next.js newer releases.
const proxyHandler = withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => AUTH_BYPASS_FOR_E2E || !!token,
    },
  }
);

export const proxy = proxyHandler;

// Protect these routes (same matcher as before)
export const config = {
  matcher: [
    "/projects/:path*",
    "/start/:path*",
    "/design/:path*",
    "/create/:path*",
    "/edit/:path*",
    "/settings/:path*",
  ],
};

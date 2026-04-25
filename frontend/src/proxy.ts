import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Reuse the same authorization logic as the previous middleware but expose
// it as a `proxy` as recommended by Next.js newer releases.
const proxyHandler = withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware() {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

// Protect these routes
export const config = {
    matcher: [
        "/projects/:path*",
        "/create/:path*",
        "/edit/:path*",
        "/settings/:path*"
    ],
};

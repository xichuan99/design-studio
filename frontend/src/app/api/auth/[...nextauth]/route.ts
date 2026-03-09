import NextAuth, { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";

// Extend types to avoid 'any' casts
interface ExtendedSession extends Session {
    user?: Session["user"] & {
        id?: string;
        provider?: string;
    };
    accessToken?: string;
}

interface ExtendedJWT extends JWT {
    id?: string;
    provider?: string;
}
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        ...(process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true"
            ? [
                CredentialsProvider({
                    name: "Test Credentials",
                    credentials: {
                        email: { label: "Email", type: "text" },
                        name: { label: "Name", type: "text" },
                    },
                    async authorize(credentials) {
                        if (credentials?.email === "test@example.com") {
                            return {
                                id: "test-user-id",
                                email: "test@example.com",
                                name: credentials.name || "Test User",
                            };
                        }
                        return null;
                    },
                }),
            ]
            : []),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account }): Promise<ExtendedJWT> {
            const jwtToken = token as ExtendedJWT;
            if (user) {
                jwtToken.id = user.id;
                jwtToken.provider = account?.provider;
            }
            return jwtToken;
        },
        async session({ session, token }): Promise<ExtendedSession> {
            const extSession = session as ExtendedSession;
            const extToken = token as ExtendedJWT;
            if (extSession.user) {
                extSession.user.id = extToken.id;
                extSession.user.provider = extToken.provider;
            }
            const jose = await import("jose");
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
            const jwt = await new jose.SignJWT({
                email: extSession.user?.email,
                name: extSession.user?.name,
                sub: extToken.id
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('30d')
                .sign(secret);

            extSession.accessToken = jwt;

            return extSession;
        },
    },
    pages: {
        signIn: "/login",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

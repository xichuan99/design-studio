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
        ...(process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true"
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
            // For MVP: Pass the NextAuth JWT to the client so it can be sent to FastAPI.
            // In a real prod environment, you might issue a separate custom backend token.
            // Since we use the raw JWT to verify on the FastAPI side, we need it here.

            // To be secure, we should only do this if we trust the client with the JWT.
            // NextAuth's token object here is the DECODED payload, not the raw signed JWT string.
            // To get the raw encoded token, we usually have to read the cookie manually or 
            // construct our own signed token. Let's create a minimal custom signed token here
            // using the same NEXTAUTH_SECRET that FastAPI uses to decode.
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
        signIn: "/", // Redirect to home if sign in is required
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

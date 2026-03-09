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
        CredentialsProvider({
            name: "Email/Password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
                    const res = await fetch(`${apiUrl}/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password
                        }),
                        headers: { "Content-Type": "application/json" }
                    });

                    const user = await res.json();

                    if (res.ok && user) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            avatar_url: user.avatar_url
                        };
                    }
                    return null;
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            },
        }),
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

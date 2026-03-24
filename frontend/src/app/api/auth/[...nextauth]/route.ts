import NextAuth, { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Extend types to avoid 'any' casts
interface ExtendedSession extends Session {
    user?: Session["user"] & {
        id?: string;
        provider?: string;
    };
    accessToken?: string;
    error?: string;
}

interface ExtendedJWT extends JWT {
    id?: string;
    provider?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
}

async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
    try {
        const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:8000/api';
        const res = await fetch(`${apiUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: token.refreshToken })
        });

        const refreshedTokens = await res.json();

        if (!res.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
    } catch (error) {
        console.error("Error refreshing Access Token", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            checks: ['pkce', 'state'],
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
                    const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:8000/api';
                    const res = await fetch(`${apiUrl}/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password
                        }),
                        headers: { "Content-Type": "application/json" }
                    });

                    const data = await res.json();

                    if (res.ok && data?.user) {
                        return {
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.name,
                            avatar_url: data.user.avatar_url,
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user, account }): Promise<ExtendedJWT> {
            const jwtToken = token as ExtendedJWT;
            
            // Initial sign in
            if (account && user) {
                if (account.provider === "google") {
                    // For Google, generate our own token to send to the backend
                    const jose = await import("jose");
                    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
                    const jwt = await new jose.SignJWT({
                        email: user.email,
                        name: user.name,
                        sub: user.id
                    })
                        .setProtectedHeader({ alg: 'HS256' })
                        .setIssuedAt()
                        .setExpirationTime('30d')
                        .sign(secret);

                    jwtToken.accessToken = jwt;
                    jwtToken.provider = "google";
                    jwtToken.id = user.id;
                    jwtToken.accessTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
                } else if (account.provider === "credentials") {
                    // This is 'user' returned from authorize
                    const credUser = user as { id?: string; accessToken?: string; refreshToken?: string };
                    jwtToken.accessToken = credUser.accessToken;
                    jwtToken.refreshToken = credUser.refreshToken;
                    jwtToken.accessTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour default
                    jwtToken.provider = "credentials";
                    jwtToken.id = user.id;
                }
                return jwtToken;
            }

            // Return previous token if the access token has not expired yet
            // Add a 5 minute buffer before expiry to rotate early
            if (Date.now() < ((jwtToken.accessTokenExpires ?? 0) - 5 * 60 * 1000)) {
                return jwtToken;
            }

            // Access token has expired, try to update it
            if (jwtToken.provider === "credentials" && jwtToken.refreshToken) {
                return await refreshAccessToken(jwtToken);
            }
            
            // For Google tokens, we fall back to returning the expired token or we can re-issue.
            // Since it's valid for 30d, it likely won't hit this often.
            return jwtToken;
        },
        async session({ session, token }): Promise<ExtendedSession> {
            const extSession = session as ExtendedSession;
            const extToken = token as ExtendedJWT;
            
            if (extSession.user) {
                extSession.user.id = extToken.id;
                extSession.user.provider = extToken.provider;
            }
            
            extSession.accessToken = extToken.accessToken;
            extSession.error = extToken.error;

            return extSession;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

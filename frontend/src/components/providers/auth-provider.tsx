"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

type SessionWithError = {
    error?: string;
};

function SessionExpiryGuard() {
    const { data: session, status } = useSession();
    const hasTriggeredRef = useRef(false);
    const sessionError = (session as SessionWithError | null)?.error;

    useEffect(() => {
        if (status !== "authenticated" || sessionError !== "RefreshAccessTokenError" || hasTriggeredRef.current) {
            return;
        }

        hasTriggeredRef.current = true;
        toast.error("Sesi Kamu telah berakhir. Silakan login kembali.");
        void signOut({ callbackUrl: "/login?reason=session-expired" });
    }, [sessionError, status]);

    return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SessionExpiryGuard />
            {children}
        </SessionProvider>
    );
}

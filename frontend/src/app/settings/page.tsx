"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProfileSection } from "./components/ProfileSection";
import { CreditsSection } from "./components/CreditsSection";
import { StorageSection } from "./components/StorageSection";
import { DangerZoneSection } from "./components/DangerZoneSection";

export default function SettingsPage() {
    const { status: sessionStatus } = useSession();
    const router = useRouter();

    // Route guard: redirect if unauthenticated
    useEffect(() => {
        if (sessionStatus === "unauthenticated") {
            router.push("/");
        }
    }, [sessionStatus, router]);

    if (sessionStatus === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-background/50">
            <AppHeader />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-16">
                <div className="mb-12 space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Pengaturan
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                        Kelola informasi identitas, referensi palet warna bisnis Anda, dan sisa
                        penggunaan kredit AI generatif.
                    </p>
                </div>

                <div className="space-y-2">
                    <ProfileSection />
                    <CreditsSection />
                    <StorageSection />
                    <DangerZoneSection />
                </div>
            </main>
        </div>
    );
}

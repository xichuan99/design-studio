"use client";

import { useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import BrandSettings from "@/components/settings/BrandSettings";
import { Loader2, Palette } from "lucide-react";

export default function BrandPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat Brand Kit...</p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <div className="flex-1 p-6 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Palette className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">Smart Brand Kit</h1>
                                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Kelola palet warna, tipografi, dan logo untuk konsistensi desain AI Anda.</p>
                            </div>
                        </div>
                    </div>

                    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
                        <BrandSettings />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

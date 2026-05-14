"use client";

import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { SellerChannelWizard } from "@/components/create/SellerChannelWizard";
import { SELLER_FIRST_V1 } from "@/lib/feature-flags";

export default function SellerPage() {
    const { status } = useSession();

    if (!SELLER_FIRST_V1) {
        redirect("/design/new/interview");
    }

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 md:px-6 lg:px-8">
                <SellerChannelWizard />
            </main>
        </div>
    );
}

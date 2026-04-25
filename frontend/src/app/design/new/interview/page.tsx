"use client";

import { useEffect, useMemo, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ArrowRight, Loader2, Megaphone, Package2, Palette, ShoppingBag, Smartphone } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DESIGN_BRIEF_SESSION_KEY } from "@/lib/design-brief-session";

const goals = [
    { id: "promo", label: "Promo cepat", icon: Megaphone },
    { id: "catalog", label: "Katalog produk", icon: Package2 },
    { id: "ads", label: "Iklan performa", icon: Smartphone },
];

const visualStyles = ["Minimal clean", "Professional tech", "Premium soft", "Bold marketplace"];
const channels = [
    { id: "instagram", label: "Instagram", icon: Smartphone },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "ads", label: "Ads", icon: Megaphone },
];

export default function DesignInterviewPage() {
    const { status } = useSession();
    const router = useRouter();
    const posthog = usePostHog();
    const [goal, setGoal] = useState("promo");
    const [style, setStyle] = useState("Minimal clean");
    const [channel, setChannel] = useState("instagram");

    const progress = useMemo(() => {
        let filled = 0;
        if (goal) filled += 1;
        if (style) filled += 1;
        if (channel) filled += 1;
        return Math.round((filled / 3) * 100);
    }, [channel, goal, style]);

    const handleContinue = () => {
        posthog?.capture("design_brief_interview_continue", {
            goal,
            style,
            channel,
        });
        window.sessionStorage.setItem(
            DESIGN_BRIEF_SESSION_KEY,
            JSON.stringify({
                goal,
                style,
                channel,
                updatedAt: new Date().toISOString(),
            })
        );
        router.push("/design/new/preview");
    };

    useEffect(() => {
        if (status !== "authenticated") return;
        posthog?.capture("design_brief_interview_viewed");
    }, [posthog, status]);

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
                <section className="sticky top-14 z-20 rounded-2xl border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Jalur desain baru</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Mulai dari brief visual, bukan panel samping.</h1>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push("/start")} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Kembali
                        </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Progress brief</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">1. Apa tujuan desain ini?</CardTitle>
                        <CardDescription>Pilih tujuan utama agar engine desain nanti bisa diarahkan lebih presisi.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        {goals.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setGoal(item.id);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "goal",
                                        value: item.id,
                                    });
                                }}
                                className={`rounded-2xl border p-4 text-left transition-colors ${goal === item.id ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background shadow-sm">
                                    <item.icon className="h-5 w-5 text-primary" />
                                </div>
                                <p className="mt-4 text-sm font-semibold text-foreground">{item.label}</p>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">2. Gaya visual yang diinginkan</CardTitle>
                        <CardDescription>Pilih satu arah utama. Anda masih bisa refine lagi di langkah berikutnya.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        {visualStyles.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setStyle(item);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "style",
                                        value: item,
                                    });
                                }}
                                className={`rounded-2xl border p-4 text-left transition-colors ${style === item ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background shadow-sm">
                                        <Palette className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{item}</p>
                                        <p className="text-xs text-muted-foreground">Dipakai sebagai arah awal untuk prompt dan preview.</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">3. Channel utama</CardTitle>
                        <CardDescription>Channel memengaruhi framing, hierarchy, dan konteks copy saat preview nanti.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        {channels.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setChannel(item.id);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "channel",
                                        value: item.id,
                                    });
                                }}
                                className={`rounded-2xl border p-4 text-left transition-colors ${channel === item.id ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                <item.icon className="h-5 w-5 text-primary" />
                                <p className="mt-4 text-sm font-semibold text-foreground">{item.label}</p>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <div className="sticky bottom-4 z-20 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Lanjutkan ke preview bertahap baru. Halaman berikutnya akan merangkum brief ini sebelum masuk ke engine desain existing sebagai fallback transisi.
                        </p>
                        <Button onClick={handleContinue} size="lg" className="gap-2 rounded-xl">
                            Lanjut ke Preview
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
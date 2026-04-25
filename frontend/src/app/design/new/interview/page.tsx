"use client";

import { useEffect, useMemo, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ArrowRight, Loader2, Megaphone, Package2, Palette, ShoppingBag, Smartphone } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DESIGN_BRIEF_SESSION_KEY } from "@/lib/design-brief-session";

const goals = [
    { id: "promo", label: "Promo cepat", icon: Megaphone },
    { id: "catalog", label: "Katalog produk", icon: Package2 },
    { id: "ads", label: "Iklan performa", icon: Smartphone },
];

const visualStyles = ["Minimal clean", "Professional tech", "Premium soft", "Bold marketplace"];
const productTypes = ["Makanan & Minuman", "Fashion", "Beauty", "Elektronik", "Rumah Tangga", "Lainnya"];
const copyTones = ["Friendly", "Persuasif", "Premium", "Urgent", "Edukatif"];
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
    const [productType, setProductType] = useState("Makanan & Minuman");
    const [style, setStyle] = useState("Minimal clean");
    const [channel, setChannel] = useState("instagram");
    const [copyTone, setCopyTone] = useState("Friendly");
    const [notes, setNotes] = useState("");

    const progress = useMemo(() => {
        let filled = 0;
        if (goal) filled += 1;
        if (productType) filled += 1;
        if (style) filled += 1;
        if (channel) filled += 1;
        if (copyTone) filled += 1;
        return Math.round((filled / 5) * 100);
    }, [channel, copyTone, goal, productType, style]);

    const handleContinue = () => {
        posthog?.capture("design_brief_interview_continue", {
            goal,
            productType,
            style,
            channel,
            copyTone,
            hasNotes: notes.trim().length > 0,
        });
        window.sessionStorage.setItem(
            DESIGN_BRIEF_SESSION_KEY,
            JSON.stringify({
                goal,
                productType,
                style,
                channel,
                copyTone,
                notes: notes.trim(),
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
                        <CardTitle className="text-xl">2. Jenis produk</CardTitle>
                        <CardDescription>Pilih kategori utama agar framing visual dan copy lebih relevan.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {productTypes.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setProductType(item);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "product_type",
                                        value: item,
                                    });
                                }}
                                className={`rounded-full border px-4 py-2 text-sm transition-colors ${productType === item ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                {item}
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">3. Gaya visual yang diinginkan</CardTitle>
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
                        <CardTitle className="text-xl">4. Channel utama</CardTitle>
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

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">5. Tone copy</CardTitle>
                        <CardDescription>Pilih nada pesan utama untuk headline dan CTA awal.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {copyTones.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setCopyTone(item);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "copy_tone",
                                        value: item,
                                    });
                                }}
                                className={`rounded-full border px-4 py-2 text-sm transition-colors ${copyTone === item ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                {item}
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">6. Catatan tambahan (opsional)</CardTitle>
                        <CardDescription>Tuliskan info penting seperti promo, harga, atau larangan visual tertentu.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Contoh: Fokus pada promo bundling, hindari warna merah, tampilkan kesan premium tapi tetap ramah."
                            rows={4}
                        />
                    </CardContent>
                </Card>

                <div className="sticky bottom-4 z-20 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Lanjutkan ke preview bertahap baru. Halaman berikutnya akan merangkum brief ini sebelum masuk ke engine desain existing sebagai fallback transisi.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={handleContinue} className="rounded-xl">
                                Skip
                            </Button>
                            <Button onClick={handleContinue} size="lg" className="gap-2 rounded-xl">
                                Lanjut ke Preview
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
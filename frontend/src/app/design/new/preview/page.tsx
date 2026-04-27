"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectApi } from "@/lib/api";
import { useToolHandoff } from "@/hooks/useToolHandoff";
import { PREVIEW_REAL_GENERATION_ENABLED } from "@/lib/feature-flags";
import { DESIGN_BRIEF_SESSION_KEY, type DesignBriefSessionState } from "@/lib/design-brief-session";

const ASPECT_RATIO_MAP: Record<string, string> = {
    instagram: "1:1",
    marketplace: "1:1",
    ads: "9:16",
};

const GOAL_LABEL_MAP: Record<string, string> = {
    promo: "promosi produk yang menarik dan engaging",
    catalog: "katalog produk yang profesional dan rapi",
    ads: "iklan performa yang eye-catching dan persuasif",
};

const CHANNEL_LABEL_MAP: Record<string, string> = {
    instagram: "Instagram feed",
    marketplace: "halaman produk marketplace",
    ads: "Google / Meta Ads",
};

const PRODUCT_TYPE_LABEL_MAP: Record<string, string> = {
    "Makanan & Minuman": "produk makanan/minuman",
    Fashion: "produk fashion",
    Beauty: "produk beauty",
    Elektronik: "produk elektronik",
    "Rumah Tangga": "produk rumah tangga",
    Lainnya: "produk umum",
};

const GEN_STATUS_LABELS = [
    "Menyiapkan komposisi visual...",
    "Menentukan palet warna...",
    "Membuat layout...",
    "Menambahkan detail desain...",
    "Hampir selesai...",
];

function buildPrompt(brief: DesignBriefSessionState): string {
    const goalLabel = GOAL_LABEL_MAP[brief.goal] ?? brief.goal;
    const channelLabel = CHANNEL_LABEL_MAP[brief.channel] ?? brief.channel;
    const productTypeLabel = brief.customProductType ?? PRODUCT_TYPE_LABEL_MAP[brief.productType] ?? brief.productType;
    const noteLine = brief.notes ? `Catatan tambahan: ${brief.notes}.` : null;
    return [
        `Buat desain ${goalLabel} untuk ${channelLabel} dengan konteks ${productTypeLabel}.`,
        `Gaya visual: ${brief.style}.`,
        `Tone copy: ${brief.copyTone}.`,
        noteLine,
        "Gunakan komposisi visual yang bersih, hierarki teks yang jelas, dan siap diedit di editor.",
    ].filter(Boolean).join(" ");
}

export default function DesignPreviewPage() {
    const { status } = useSession();
    const router = useRouter();
    const posthog = usePostHog();
    const { generateDesign, getJobStatus } = useProjectApi();
    const { openInEditor, isLoading: handoffLoading } = useToolHandoff();

    const [brief, setBrief] = useState<DesignBriefSessionState | null | undefined>(undefined);
    const [generating, setGenerating] = useState(false);
    const [genStatusIdx, setGenStatusIdx] = useState(0);
    const [genError, setGenError] = useState<string | null>(null);
    const [skipAiGenerate, setSkipAiGenerate] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            const saved = window.sessionStorage.getItem(DESIGN_BRIEF_SESSION_KEY);
            if (!saved) { setBrief(null); return; }
            try {
                setBrief(JSON.parse(saved) as DesignBriefSessionState);
            } catch {
                setBrief(null);
            }
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        setSkipAiGenerate(!!brief?.productImageUrl);
    }, [brief?.productImageUrl]);

    // Cycle through status labels while generating
    useEffect(() => {
        if (!generating) return;
        const interval = setInterval(() => {
            setGenStatusIdx(prev => (prev + 1) % GEN_STATUS_LABELS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [generating]);

    const draftPrompt = useMemo(() => (brief ? buildPrompt(brief) : ""), [brief]);
    const aspectRatio = brief ? (ASPECT_RATIO_MAP[brief.channel] ?? "1:1") : "1:1";

    const openLegacyEngine = () => {
        if (brief) {
            posthog?.capture("design_brief_preview_legacy_clicked", {
                goal: brief.goal,
                style: brief.style,
                channel: brief.channel,
            });
            window.localStorage.setItem("smartdesign_create_state", JSON.stringify({
                rawText: draftPrompt,
                aspectRatio,
                currentStep: "input",
                createMode: "generate",
                briefAnswers: {
                    goal: brief.goal,
                    productType: brief.productType,
                    customProductType: brief.customProductType,
                    style: brief.style,
                    channel: brief.channel,
                    copyTone: brief.copyTone,
                    notes: brief.notes,
                    productImageUrl: brief.productImageUrl,
                },
            }));
        }
        router.push("/create?legacy=1");
    };

    const handleGenerate = async () => {
        if (!brief) return;
        posthog?.capture("design_brief_preview_generate_clicked", {
            goal: brief.goal,
            productType: brief.productType,
            style: brief.style,
            channel: brief.channel,
            copyTone: brief.copyTone,
            hasProductImage: !!brief.productImageUrl,
            skipAiGenerate,
            preview_real_generation_enabled: PREVIEW_REAL_GENERATION_ENABLED,
        });
        if (!PREVIEW_REAL_GENERATION_ENABLED) {
            openLegacyEngine();
            return;
        }

        if (skipAiGenerate && brief.productImageUrl) {
            try {
                await openInEditor({
                    resultUrl: brief.productImageUrl,
                    sourceTool: "design-brief",
                    title: `Desain ${brief.goal} — ${brief.style}`,
                    intent: "design_brief",
                    entryMode: "brief_preview",
                    primaryAsset: {
                        url: brief.productImageUrl,
                        filename: "uploaded-product-image",
                    },
                });
                posthog?.capture("design_brief_preview_open_editor_from_product_image", {
                    goal: brief.goal,
                    style: brief.style,
                    channel: brief.channel,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Gagal membuka editor.";
                setGenError(message);
            }
            return;
        }

        setGenError(null);
        setGenerating(true);
        setGenStatusIdx(0);
        try {
            const jobData = await generateDesign({
                raw_text: draftPrompt,
                aspect_ratio: aspectRatio,
                product_image_url: brief.productImageUrl,
            });
            const jobId = jobData.job_id;

            const fetchResult = async () => {
                const s = await getJobStatus(jobId);
                if (s.status === "completed" && s.result_url) return s.result_url as string;
                if (s.status === "failed") throw new Error(s.error_message || "Generation gagal");
                return null;
            };

            // If already done synchronously
            let resultUrl = await fetchResult();
            if (!resultUrl) {
                const maxAttempts = 90;
                for (let i = 0; i < maxAttempts && !resultUrl; i++) {
                    await new Promise<void>(resolve => setTimeout(resolve, 2000));
                    resultUrl = await fetchResult();
                }
            }
            if (!resultUrl) throw new Error("Generation timeout. Coba lagi.");

            await openInEditor({
                resultUrl,
                sourceTool: "design-brief",
                title: `Desain ${brief.goal} — ${brief.style}`,
                intent: "design_brief",
                entryMode: "brief_preview",
            });
            posthog?.capture("design_brief_preview_generate_success", {
                goal: brief.goal,
                productType: brief.productType,
                style: brief.style,
                channel: brief.channel,
                copyTone: brief.copyTone,
                skipAiGenerate,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.";
            setGenError(message);
            posthog?.capture("design_brief_preview_generate_failed", {
                goal: brief.goal,
                productType: brief.productType,
                style: brief.style,
                channel: brief.channel,
                copyTone: brief.copyTone,
                skipAiGenerate,
                error_message: message,
            });
        } finally {
            setGenerating(false);
        }
    };

    const isWorking = generating || handoffLoading;

    useEffect(() => {
        if (status !== "authenticated" || !brief) return;
        posthog?.capture("design_brief_preview_viewed", {
            goal: brief.goal,
            productType: brief.productType,
            style: brief.style,
            channel: brief.channel,
            copyTone: brief.copyTone,
            hasProductImage: !!brief.productImageUrl,
            skipAiGenerate,
            preview_real_generation_enabled: PREVIEW_REAL_GENERATION_ENABLED,
        });
    }, [brief, posthog, skipAiGenerate, status]);

    if (status === "loading" || brief === undefined) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    if (!brief) {
        return (
            <div className="min-h-screen bg-background">
                <AppHeader />
                <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl items-center px-4 py-8 md:px-6">
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle className="text-2xl">Brief belum tersedia</CardTitle>
                            <CardDescription>Kembali ke interview terlebih dahulu agar preview bisa menampilkan ringkasan desain baru.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-between">
                            <Button variant="ghost" onClick={() => router.push("/start")}>Kembali ke Start</Button>
                            <Button onClick={() => router.push("/design/new/interview")}>Isi Interview</Button>
                        </CardFooter>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">

                {/* Hero section */}
                <section className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 px-6 py-8 md:px-8">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Brief siap di-generate</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                            AI akan membuat desain awal langsung dari brief ini.
                        </h1>
                        <p className="text-sm leading-6 text-muted-foreground md:text-base">
                            Ringkasan brief di bawah sudah cukup untuk menghasilkan desain awal. Setelah selesai, desain langsung terbuka di editor untuk Anda poles lebih lanjut.
                        </p>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    {/* Brief summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Ringkasan brief</CardTitle>
                            <CardDescription>Ini yang akan dikirim ke AI sebagai dasar pembuatan desain.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Goal</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground capitalize">{brief.goal}</p>
                                </div>
                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Product Type</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{brief.customProductType ?? brief.productType}</p>
                                </div>
                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Style</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{brief.style}</p>
                                </div>
                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Channel</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground capitalize">{brief.channel}</p>
                                </div>
                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Copy Tone</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{brief.copyTone}</p>
                                </div>
                            </div>

                            {brief.notes && (
                                <div className="rounded-2xl border bg-muted/20 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catatan tambahan</p>
                                    <p className="mt-3 text-sm leading-7 text-foreground">{brief.notes}</p>
                                </div>
                            )}

                            <div className="rounded-2xl border bg-muted/20 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prompt yang akan digunakan</p>
                                <p className="mt-3 text-sm leading-7 text-foreground">{draftPrompt}</p>
                            </div>

                            {brief.productImageUrl && (
                                <div className="space-y-3 rounded-2xl border bg-muted/20 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Foto produk</p>
                                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">Diunggah</span>
                                    </div>
                                    <div className="relative h-40 w-full overflow-hidden rounded-xl border bg-background">
                                        <Image
                                            src={brief.productImageUrl}
                                            alt="Foto produk yang diunggah"
                                            fill
                                            sizes="(max-width: 1024px) 100vw, 600px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                </div>
                            )}

                            {brief.productImageUrl && (
                                <div className="space-y-2 rounded-2xl border bg-muted/20 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mode visual</p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setSkipAiGenerate(false)}
                                            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${!skipAiGenerate ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                                        >
                                            Generate gambar AI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSkipAiGenerate(true)}
                                            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${skipAiGenerate ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                                        >
                                            Pakai foto produk langsung (tanpa AI)
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-md border bg-muted/30 px-2 py-0.5 font-mono">{aspectRatio}</span>
                                <span>Rasio otomatis berdasarkan channel</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* What happens next */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Sparkles className="h-5 w-5 text-primary" /> Apa yang terjadi berikutnya?
                            </CardTitle>
                            <CardDescription>Proses generate biasanya memakan waktu 30–60 detik.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div className="flex gap-3 rounded-2xl border bg-muted/20 p-4">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p>AI membuat desain berdasarkan goal, style, dan channel yang dipilih.</p>
                            </div>
                            <div className="flex gap-3 rounded-2xl border bg-muted/20 p-4">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p>Hasil langsung tersimpan sebagai project draft dan terbuka di editor.</p>
                            </div>
                            <div className="flex gap-3 rounded-2xl border bg-muted/20 p-4">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p>Anda bisa menambahkan teks, logo, mengubah warna, atau regenerate dari editor.</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Generation progress / error feedback */}
                {isWorking && (
                    <div className="flex items-center gap-4 rounded-2xl border bg-primary/5 px-5 py-4">
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {handoffLoading ? "Membuka editor..." : GEN_STATUS_LABELS[genStatusIdx]}
                            </p>
                            <p className="text-xs text-muted-foreground">Jangan tutup halaman ini</p>
                        </div>
                    </div>
                )}

                {genError && !isWorking && (
                    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                        <div>
                            <p className="text-sm font-semibold text-destructive">Generate gagal</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{genError}</p>
                        </div>
                    </div>
                )}

                {/* Sticky action bar */}
                <div className="sticky bottom-4 z-20 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" className="gap-2" onClick={() => router.push("/design/new/interview")} disabled={isWorking}>
                                <ArrowLeft className="h-4 w-4" />
                                Ubah Brief
                            </Button>
                            <Button
                                variant="link"
                                size="sm"
                                className="text-muted-foreground"
                                disabled={isWorking}
                                onClick={openLegacyEngine}
                            >
                                Pakai engine lama
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                        <Button size="lg" className="gap-2 rounded-xl" onClick={handleGenerate} disabled={isWorking}>
                            {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            {isWorking ? "Sedang generate..." : (skipAiGenerate && brief.productImageUrl ? "Buka Editor dengan Foto Ini" : "Generate Desain")}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Download, Loader2, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProjectApi } from "@/lib/api";
import { useToolHandoff } from "@/hooks/useToolHandoff";
import { PREVIEW_REAL_GENERATION_ENABLED } from "@/lib/feature-flags";
import { DESIGN_BRIEF_SESSION_KEY, type DesignBriefSessionState } from "@/lib/design-brief-session";
import type { CatalogRenderStatusResponse } from "@/lib/api/types";

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

function mapCopyToneToCatalogTone(copyTone: string): "formal" | "fun" | "premium" | "soft_selling" {
    if (copyTone === "Premium") return "premium";
    if (copyTone === "Friendly") return "fun";
    if (copyTone === "Edukatif") return "formal";
    return "soft_selling";
}

function buildPrompt(brief: DesignBriefSessionState): string {
    const goalLabel = GOAL_LABEL_MAP[brief.goal] ?? brief.goal;
    const channelLabel = CHANNEL_LABEL_MAP[brief.channel] ?? brief.channel;
    const productTypeLabel = brief.customProductType ?? PRODUCT_TYPE_LABEL_MAP[brief.productType] ?? brief.productType;
    const noteLine = brief.notes ? `Catatan tambahan: ${brief.notes}.` : null;
    const catalogLine = brief.goal === "catalog" && brief.catalogTotalPages
        ? `Rancang sebagai katalog ${brief.catalogType ?? "product"} dengan ${brief.catalogTotalPages} halaman.`
        : null;
    return [
        `Buat desain ${goalLabel} untuk ${channelLabel} dengan konteks ${productTypeLabel}.`,
        catalogLine,
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
    const {
        generateDesign,
        getJobStatus,
        finalizeCatalogPlan,
        startCatalogRender,
        getCatalogRenderStatus,
    } = useProjectApi();
    const { openInEditor, isLoading: handoffLoading } = useToolHandoff();

    const [brief, setBrief] = useState<DesignBriefSessionState | null | undefined>(undefined);
    const [generating, setGenerating] = useState(false);
    const [genStatusIdx, setGenStatusIdx] = useState(0);
    const [genError, setGenError] = useState<string | null>(null);
    const [skipAiGenerate, setSkipAiGenerate] = useState(false);
    const [referenceFocus, setReferenceFocus] = useState<"auto" | "human" | "object">("auto");
    const [showLongRunningHint, setShowLongRunningHint] = useState(false);
    const [catalogRenderProgressLabel, setCatalogRenderProgressLabel] = useState<string | null>(null);
    const [catalogRenderResult, setCatalogRenderResult] = useState<CatalogRenderStatusResponse | null>(null);
    const [catalogSelectedStyle, setCatalogSelectedStyle] = useState<string>("");
    const [catalogEditablePages, setCatalogEditablePages] = useState<DesignBriefSessionState["catalogGeneratedPages"]>([]);
    const [catalogEditableMappings, setCatalogEditableMappings] = useState<DesignBriefSessionState["catalogImageMapping"]>([]);
    const [catalogMappingValidation, setCatalogMappingValidation] = useState<Record<string, string>>({});
    const [catalogRefreshError, setCatalogRefreshError] = useState<string | null>(null);
    const [isRefreshingCatalogPlan, setIsRefreshingCatalogPlan] = useState(false);

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
        setReferenceFocus(brief?.referenceFocus ?? "auto");
    }, [brief?.productImageUrl, brief?.referenceFocus]);

    useEffect(() => {
        setCatalogSelectedStyle(brief?.catalogSelectedStyle || brief?.catalogStyleOptions?.[0]?.style || "");
        setCatalogEditablePages(
            brief?.catalogGeneratedPages
            || brief?.catalogFinalPlan?.pages
            || brief?.catalogSuggestedStructure
            || []
        );
        setCatalogEditableMappings(brief?.catalogImageMapping || []);
        setCatalogMappingValidation({});
    }, [brief?.catalogFinalPlan?.pages, brief?.catalogGeneratedPages, brief?.catalogImageMapping, brief?.catalogSelectedStyle, brief?.catalogStyleOptions, brief?.catalogSuggestedStructure]);

    useEffect(() => {
        if (!generating) {
            setShowLongRunningHint(false);
            setCatalogRenderProgressLabel(null);
            return;
        }
        const timer = setTimeout(() => {
            setShowLongRunningHint(true);
        }, 45000);
        return () => clearTimeout(timer);
    }, [generating]);

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
    const hasCatalogPlan = !!brief?.catalogSuggestedStructure?.length;
    const mappingPageUpperBound = brief?.catalogTotalPages || 0;
    const hasInvalidMapping = useMemo(() => {
        if (!catalogEditableMappings?.length) return false;
        if (Object.keys(catalogMappingValidation).length > 0) return true;
        return catalogEditableMappings.some((mapping) => !mapping.recommended_pages?.length);
    }, [catalogEditableMappings, catalogMappingValidation]);

    const persistBriefState = (nextBrief: DesignBriefSessionState) => {
        setBrief(nextBrief);
        window.sessionStorage.setItem(DESIGN_BRIEF_SESSION_KEY, JSON.stringify(nextBrief));
    };

    const handleCatalogPageTitleChange = (pageNumber: number, nextTitle: string) => {
        setCatalogEditablePages((prevPages = []) => prevPages.map((page) => {
            if (page.page_number !== pageNumber) return page;
            return {
                ...page,
                content: {
                    ...page.content,
                    title: nextTitle,
                },
            };
        }));
    };

    const handleCatalogMappingCategoryChange = (imageId: string, nextCategory: string) => {
        setCatalogEditableMappings((prevMappings = []) => prevMappings.map((mapping) => {
            if (mapping.image_id !== imageId) return mapping;
            return {
                ...mapping,
                category: nextCategory,
            };
        }));
    };

    const handleCatalogMappingPagesChange = (imageId: string, nextPagesRaw: string) => {
        const chunks = nextPagesRaw
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

        const invalid = chunks.filter((chunk) => {
            const value = Number(chunk);
            if (!Number.isInteger(value)) return true;
            if (value < 1) return true;
            if (mappingPageUpperBound > 0 && value > mappingPageUpperBound) return true;
            return false;
        });

        setCatalogMappingValidation((prev) => {
            const next = { ...prev };
            if (invalid.length > 0) {
                next[imageId] = mappingPageUpperBound > 0
                    ? `Halaman harus berada di rentang 1-${mappingPageUpperBound}.`
                    : "Format halaman tidak valid.";
            } else {
                delete next[imageId];
            }
            return next;
        });

        const nextPages = chunks
            .map((chunk) => Number(chunk))
            .filter((value) => Number.isInteger(value) && value > 0 && (mappingPageUpperBound <= 0 || value <= mappingPageUpperBound));

        setCatalogEditableMappings((prevMappings = []) => prevMappings.map((mapping) => {
            if (mapping.image_id !== imageId) return mapping;
            return {
                ...mapping,
                recommended_pages: nextPages,
            };
        }));
    };

    const handleRefreshCatalogPlan = async () => {
        if (!brief || brief.goal !== "catalog" || !brief.catalogType || !brief.catalogTotalPages) {
            return;
        }

        if (hasInvalidMapping) {
            setCatalogRefreshError("Periksa kembali halaman target image mapping sebelum memperbarui rencana katalog.");
            return;
        }

        setCatalogRefreshError(null);
        setIsRefreshingCatalogPlan(true);
        try {
            const refreshedPlan = await finalizeCatalogPlan({
                basics: {
                    catalog_type: brief.catalogType,
                    total_pages: brief.catalogTotalPages,
                    goal: brief.catalogType === "service" ? "showcasing" : "selling",
                    tone: brief.catalogFinalPlan?.tone || mapCopyToneToCatalogTone(brief.copyTone),
                    language: "id",
                    business_name: brief.customProductType || brief.productType,
                    business_context: brief.notes,
                },
                selected_style: catalogSelectedStyle || brief.catalogSelectedStyle || brief.style,
                structure: brief.catalogSuggestedStructure || [],
                image_mapping: catalogEditableMappings || [],
                page_copy: catalogEditablePages || [],
            });

            const nextBrief: DesignBriefSessionState = {
                ...brief,
                catalogSelectedStyle: catalogSelectedStyle || brief.catalogSelectedStyle,
                catalogImageMapping: catalogEditableMappings,
                catalogGeneratedPages: catalogEditablePages,
                catalogFinalPlan: refreshedPlan,
                updatedAt: new Date().toISOString(),
            };
            persistBriefState(nextBrief);
            posthog?.capture("design_brief_catalog_plan_refreshed", {
                total_pages: refreshedPlan.total_pages,
                selected_style: nextBrief.catalogSelectedStyle,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Gagal memperbarui rencana katalog.";
            setCatalogRefreshError(message);
        } finally {
            setIsRefreshingCatalogPlan(false);
        }
    };

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
                    referenceFocus,
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
            referenceFocus,
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
            if (brief.goal === "catalog") {
                if (!brief.catalogFinalPlan) {
                    throw new Error("Rencana katalog belum lengkap. Perbarui rencana katalog terlebih dahulu.");
                }

                const startResponse = await startCatalogRender({
                    final_plan: brief.catalogFinalPlan,
                    options: {
                        aspect_ratio: aspectRatio,
                        language: "id",
                        quality_mode: "standard",
                        reference_image_url: brief.productImageUrl,
                    },
                });

                const baseBrief: DesignBriefSessionState = {
                    ...brief,
                    catalogRenderJobId: startResponse.job_id,
                    catalogRenderStatus: startResponse.status,
                    updatedAt: new Date().toISOString(),
                };
                persistBriefState(baseBrief);

                let finalStatus = await getCatalogRenderStatus(startResponse.job_id);
                const maxAttempts = 180;

                for (let i = 0; i < maxAttempts; i++) {
                    setCatalogRenderProgressLabel(
                        `Render katalog ${finalStatus.progress.completed_pages}/${finalStatus.progress.total_pages} halaman`
                    );

                    if (finalStatus.status === "completed") {
                        break;
                    }
                    if (finalStatus.status === "failed" || finalStatus.status === "canceled") {
                        throw new Error(finalStatus.error_message || "Catalog render gagal diproses.");
                    }

                    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
                    finalStatus = await getCatalogRenderStatus(startResponse.job_id);
                }

                if (finalStatus.status !== "completed") {
                    throw new Error("Render katalog masih berjalan lebih lama dari biasanya. Coba cek lagi beberapa saat.");
                }

                if (!finalStatus.pages.some((page) => !!page.result_url)) {
                    throw new Error("Render katalog selesai tanpa hasil halaman yang dapat dibuka.");
                }

                const completedBrief: DesignBriefSessionState = {
                    ...baseBrief,
                    catalogRenderStatus: finalStatus.status,
                    catalogRenderZipUrl: finalStatus.zip_url || undefined,
                    catalogRenderedPages: finalStatus.pages,
                    updatedAt: new Date().toISOString(),
                };
                persistBriefState(completedBrief);
                setCatalogRenderResult(finalStatus);

                posthog?.capture("design_brief_preview_catalog_render_success", {
                    goal: brief.goal,
                    total_pages: finalStatus.progress.total_pages,
                    completed_pages: finalStatus.progress.completed_pages,
                    has_zip_url: Boolean(finalStatus.zip_url),
                });
                return;
            }

            const jobData = await generateDesign({
                raw_text: draftPrompt,
                aspect_ratio: aspectRatio,
                reference_image_url: brief.productImageUrl,
                reference_focus: referenceFocus,
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
                const maxAttempts = 180;
                for (let i = 0; i < maxAttempts && !resultUrl; i++) {
                    await new Promise<void>(resolve => setTimeout(resolve, 2000));
                    resultUrl = await fetchResult();
                }
            }
            if (!resultUrl) throw new Error("Generation masih berjalan lebih lama dari biasanya. Coba cek lagi beberapa saat atau ulangi dengan prompt yang lebih ringkas.");

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
                referenceFocus,
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
                referenceFocus,
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
            referenceFocus,
            preview_real_generation_enabled: PREVIEW_REAL_GENERATION_ENABLED,
        });
    }, [brief, posthog, referenceFocus, skipAiGenerate, status]);

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
                            {brief.goal === "catalog"
                                ? "Ringkasan brief katalog di bawah sudah memuat struktur awal dan arah style dari AI. Ini menjadi pijakan sebelum masuk ke tahap render atau editor berikutnya."
                                : "Ringkasan brief di bawah sudah cukup untuk menghasilkan desain awal. Setelah selesai, desain langsung terbuka di editor untuk Anda poles lebih lanjut."}
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
                                {brief.goal === "catalog" && brief.catalogType && (
                                    <div className="rounded-2xl border bg-muted/20 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catalog Type</p>
                                        <p className="mt-2 text-sm font-semibold text-foreground capitalize">{brief.catalogType}</p>
                                    </div>
                                )}
                                {brief.goal === "catalog" && brief.catalogTotalPages && (
                                    <div className="rounded-2xl border bg-muted/20 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total Pages</p>
                                        <p className="mt-2 text-sm font-semibold text-foreground">{brief.catalogTotalPages}</p>
                                    </div>
                                )}
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

                            {brief.goal === "catalog" && hasCatalogPlan && (
                                <div className="space-y-3 rounded-2xl border bg-muted/20 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Struktur katalog awal</p>
                                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{brief.catalogSuggestedStructure?.length} halaman</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {brief.catalogSuggestedStructure?.map((page) => (
                                            <div key={page.page_number} className="rounded-xl border bg-background p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-foreground">Halaman {page.page_number}</p>
                                                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{page.layout}</span>
                                                </div>
                                                <p className="mt-2 text-sm text-foreground">{String(page.content.title ?? page.type)}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{page.type}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {brief.goal === "catalog" && !!brief.catalogStyleOptions?.length && (
                                <div className="space-y-3 rounded-2xl border bg-muted/20 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Arah style yang disarankan AI</p>
                                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">overrideable</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {brief.catalogStyleOptions?.map((option) => (
                                            <button
                                                key={option.style}
                                                type="button"
                                                onClick={() => setCatalogSelectedStyle(option.style)}
                                                className={`rounded-xl border p-4 text-left ${catalogSelectedStyle === option.style ? "border-primary bg-primary/5" : "bg-background"}`}
                                            >
                                                <p className="text-sm font-semibold text-foreground">{option.style}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                                                <p className="mt-2 text-xs text-muted-foreground">Use case: {option.use_case}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">Layout: {option.layout}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {brief.goal === "catalog" && !!brief.catalogImageMapping?.length && (
                                <div className="space-y-3 rounded-2xl border bg-muted/20 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Override image mapping</p>
                                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">editable role + pages</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {(catalogEditableMappings || []).map((mapping) => (
                                            <div key={mapping.image_id} className="rounded-xl border bg-background p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-foreground">{mapping.image_id}</p>
                                                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{Math.round(mapping.confidence * 100)}%</span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {[
                                                        "cover_image",
                                                        "product_image",
                                                        "service_image",
                                                        "detail_image",
                                                        "supporting_image",
                                                    ].map((option) => (
                                                        <button
                                                            key={`${mapping.image_id}-${option}`}
                                                            type="button"
                                                            onClick={() => handleCatalogMappingCategoryChange(mapping.image_id, option)}
                                                            className={`rounded-full border px-3 py-1 text-xs ${mapping.category === option ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="mt-3">
                                                    <Input
                                                        value={mapping.recommended_pages.join(", ")}
                                                        onChange={(event) => handleCatalogMappingPagesChange(mapping.image_id, event.target.value)}
                                                        aria-label={`Halaman target untuk ${mapping.image_id}`}
                                                    />
                                                    <p className="mt-1 text-xs text-muted-foreground">Isi daftar halaman dengan format koma, contoh: 1, 3, 5</p>
                                                    {catalogMappingValidation[mapping.image_id] && (
                                                        <p className="mt-1 text-xs text-destructive">{catalogMappingValidation[mapping.image_id]}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {brief.goal === "catalog" && !!brief.catalogGeneratedPages?.length && (
                                <div className="space-y-3 rounded-2xl border bg-muted/20 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Override halaman katalog</p>
                                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">edit title + refresh</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {catalogEditablePages?.map((page) => (
                                            <div key={`editable-${page.page_number}`} className="rounded-xl border bg-background p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-foreground">Halaman {page.page_number}</p>
                                                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{page.type}</span>
                                                </div>
                                                <Input
                                                    className="mt-3"
                                                    value={String(page.content.title ?? "")}
                                                    onChange={(event) => handleCatalogPageTitleChange(page.page_number, event.target.value)}
                                                    aria-label={`Judul halaman katalog ${page.page_number}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {catalogRefreshError && <p className="text-xs text-destructive">{catalogRefreshError}</p>}
                                    <Button type="button" variant="outline" onClick={handleRefreshCatalogPlan} disabled={isRefreshingCatalogPlan || hasInvalidMapping}>
                                        {isRefreshingCatalogPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isRefreshingCatalogPlan ? "Memperbarui rencana katalog..." : "Perbarui Rencana Katalog"}
                                    </Button>
                                </div>
                            )}

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
                                    {!skipAiGenerate && (
                                        <div className="space-y-2 pt-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fokus referensi</p>
                                            <div className="grid gap-2 sm:grid-cols-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setReferenceFocus("auto")}
                                                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${referenceFocus === "auto" ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                                                >
                                                    Auto
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReferenceFocus("human")}
                                                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${referenceFocus === "human" ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                                                >
                                                    Orang
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReferenceFocus("object")}
                                                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${referenceFocus === "object" ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                                                >
                                                    Objek
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                <p>{brief.goal === "catalog" ? "AI sudah menyiapkan struktur, style, dan mapping gambar untuk dievaluasi sebelum render." : "AI membuat desain berdasarkan goal, style, dan channel yang dipilih."}</p>
                            </div>
                            <div className="flex gap-3 rounded-2xl border bg-muted/20 p-4">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p>{brief.goal === "catalog" ? "Tahap berikutnya bisa menyambungkan rencana katalog ini ke renderer atau editor multi-page." : "Hasil langsung tersimpan sebagai project draft dan terbuka di editor."}</p>
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
                                {handoffLoading ? "Membuka editor..." : (catalogRenderProgressLabel || GEN_STATUS_LABELS[genStatusIdx])}
                            </p>
                            <p className="text-xs text-muted-foreground">Jangan tutup halaman ini</p>
                            {showLongRunningHint && (
                                <p className="mt-1 text-xs text-muted-foreground">Proses lebih lama dari biasanya karena render detail referensi. Sistem tetap melanjutkan generate.</p>
                            )}
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

                {/* Catalog render gallery */}
                {catalogRenderResult && (
                    <section className="space-y-4 rounded-3xl border bg-muted/20 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Render katalog selesai</p>
                                <h2 className="mt-1 text-xl font-semibold text-foreground">
                                    {catalogRenderResult.progress.completed_pages} dari {catalogRenderResult.progress.total_pages} halaman berhasil dirender
                                </h2>
                            </div>
                            {catalogRenderResult.zip_url && (
                                <a
                                    href={catalogRenderResult.zip_url}
                                    download="catalog-pages.zip"
                                    className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    Download semua halaman (ZIP)
                                </a>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {catalogRenderResult.pages.map((page) => (
                                <div key={page.page_number} className="group relative overflow-hidden rounded-xl border bg-background">
                                    {page.result_url ? (
                                        <>
                                            <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
                                                <Image
                                                    src={page.result_url}
                                                    alt={`Halaman ${page.page_number}`}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                                    unoptimized
                                                />
                                                {page.fallback_used && (
                                                    <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                        Fallback
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs font-semibold text-foreground">Halaman {page.page_number}</p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 w-full rounded-lg text-xs"
                                                    disabled={handoffLoading}
                                                    onClick={() =>
                                                        openInEditor({
                                                            resultUrl: page.result_url!,
                                                            sourceTool: "design-brief",
                                                            title: `Katalog — Halaman ${page.page_number}`,
                                                            intent: "design_brief",
                                                            entryMode: "brief_preview_catalog_render",
                                                        })
                                                    }
                                                >
                                                    {handoffLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                                                    Buka di editor
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex aspect-square flex-col items-center justify-center gap-2 p-4">
                                            <AlertCircle className="h-6 w-6 text-destructive/60" />
                                            <p className="text-center text-xs text-muted-foreground">Halaman {page.page_number} gagal dirender</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
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
                        <Button size="lg" className="gap-2 rounded-xl" onClick={handleGenerate} disabled={isWorking || !!catalogRenderResult}>
                            {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            {isWorking ? "Sedang generate..." : catalogRenderResult ? "Render selesai" : (skipAiGenerate && brief.productImageUrl ? "Buka Editor dengan Foto Ini" : "Generate Desain")}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { CatalogRenderStatusResponse } from "@/lib/api/types";
import { BriefSummaryCard } from "./BriefSummaryCard";
import { CatalogRenderGallery } from "./CatalogRenderGallery";
import {
    ASPECT_RATIO_MAP,
    GEN_STATUS_LABELS,
    buildPrompt,
    mapCopyToneToCatalogTone,
} from "./utils";

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
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

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
                    headlineOverride: brief.headlineOverride,
                    subHeadlineOverride: brief.subHeadlineOverride,
                    ctaOverride: brief.ctaOverride,
                    productName: brief.productName,
                    offerText: brief.offerText,
                    useAiCopyAssist: brief.useAiCopyAssist,
                    notes: brief.notes,
                    productImageUrl: brief.productImageUrl,
                    referenceFocus,
                },
                manualCopyOverrides: {
                    headlineOverride: brief.headlineOverride || "",
                    subHeadlineOverride: brief.subHeadlineOverride || "",
                    ctaOverride: brief.ctaOverride || "",
                    productName: brief.productName || "",
                    offerText: brief.offerText || "",
                    useAiCopyAssist: brief.useAiCopyAssist,
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

                for (let i = 0; i < maxAttempts && isMountedRef.current; i++) {
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
                    if (!isMountedRef.current) {
                        return;
                    }
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
                headline_override: brief.headlineOverride,
                sub_headline_override: brief.subHeadlineOverride,
                cta_override: brief.ctaOverride,
                product_name: brief.productName,
                offer_text: brief.offerText,
                use_ai_copy_assist: brief.useAiCopyAssist,
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
                for (let i = 0; i < maxAttempts && !resultUrl && isMountedRef.current; i++) {
                    await new Promise<void>(resolve => setTimeout(resolve, 2000));
                    if (!isMountedRef.current) {
                        return;
                    }
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
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Brief siap digenerate</p>
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
                    <BriefSummaryCard
                        brief={brief}
                        draftPrompt={draftPrompt}
                        aspectRatio={aspectRatio}
                        catalogSelectedStyle={catalogSelectedStyle}
                        setCatalogSelectedStyle={setCatalogSelectedStyle}
                        catalogEditableMappings={catalogEditableMappings}
                        catalogEditablePages={catalogEditablePages}
                        catalogMappingValidation={catalogMappingValidation}
                        catalogRefreshError={catalogRefreshError}
                        isRefreshingCatalogPlan={isRefreshingCatalogPlan}
                        hasInvalidMapping={hasInvalidMapping}
                        skipAiGenerate={skipAiGenerate}
                        setSkipAiGenerate={setSkipAiGenerate}
                        referenceFocus={referenceFocus}
                        setReferenceFocus={setReferenceFocus}
                        onCatalogPageTitleChange={handleCatalogPageTitleChange}
                        onCatalogMappingCategoryChange={handleCatalogMappingCategoryChange}
                        onCatalogMappingPagesChange={handleCatalogMappingPagesChange}
                        onRefreshCatalogPlan={handleRefreshCatalogPlan}
                    />

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
                                <p>Kamu bisa menambahkan teks, logo, mengubah warna, atau regenerate dari editor.</p>
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
                    <CatalogRenderGallery
                        result={catalogRenderResult}
                        handoffLoading={handoffLoading}
                        onOpenInEditor={openInEditor}
                    />
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
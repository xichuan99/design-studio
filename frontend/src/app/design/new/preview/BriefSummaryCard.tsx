"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DesignBriefSessionState } from "@/lib/design-brief-session";

interface BriefSummaryCardProps {
    brief: DesignBriefSessionState;
    draftPrompt: string;
    aspectRatio: string;
    catalogSelectedStyle: string;
    setCatalogSelectedStyle: (style: string) => void;
    catalogEditableMappings: DesignBriefSessionState["catalogImageMapping"];
    catalogEditablePages: DesignBriefSessionState["catalogGeneratedPages"];
    catalogMappingValidation: Record<string, string>;
    catalogRefreshError: string | null;
    isRefreshingCatalogPlan: boolean;
    hasInvalidMapping: boolean;
    skipAiGenerate: boolean;
    setSkipAiGenerate: (v: boolean) => void;
    referenceFocus: "auto" | "human" | "object";
    setReferenceFocus: (v: "auto" | "human" | "object") => void;
    onCatalogPageTitleChange: (pageNumber: number, nextTitle: string) => void;
    onCatalogMappingCategoryChange: (imageId: string, nextCategory: string) => void;
    onCatalogMappingPagesChange: (imageId: string, nextPagesRaw: string) => void;
    onRefreshCatalogPlan: () => void;
}

export function BriefSummaryCard({
    brief,
    draftPrompt,
    aspectRatio,
    catalogSelectedStyle,
    setCatalogSelectedStyle,
    catalogEditableMappings,
    catalogEditablePages,
    catalogMappingValidation,
    catalogRefreshError,
    isRefreshingCatalogPlan,
    hasInvalidMapping,
    skipAiGenerate,
    setSkipAiGenerate,
    referenceFocus,
    setReferenceFocus,
    onCatalogPageTitleChange,
    onCatalogMappingCategoryChange,
    onCatalogMappingPagesChange,
    onRefreshCatalogPlan,
}: BriefSummaryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Ringkasan brief</CardTitle>
                <CardDescription>Ini yang akan dikirim ke AI sebagai dasar pembuatan desain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tujuan</p>
                        <p className="mt-2 text-sm font-semibold text-foreground capitalize">{brief.goal}</p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Jenis Produk</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{brief.customProductType ?? brief.productType}</p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gaya</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{brief.style}</p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Channel Utama</p>
                        <p className="mt-2 text-sm font-semibold text-foreground capitalize">{brief.channel}</p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Nada Copy</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{brief.copyTone}</p>
                    </div>
                    {brief.goal === "catalog" && brief.catalogType && (
                        <div className="rounded-2xl border bg-muted/20 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tipe Katalog</p>
                            <p className="mt-2 text-sm font-semibold text-foreground capitalize">{brief.catalogType}</p>
                        </div>
                    )}
                    {brief.goal === "catalog" && brief.catalogTotalPages && (
                        <div className="rounded-2xl border bg-muted/20 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total Halaman</p>
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

                {brief.goal === "catalog" && !!brief.catalogSuggestedStructure?.length && (
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
                            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">bisa diubah</span>
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
                                    <p className="mt-2 text-xs text-muted-foreground">Konteks: {option.use_case}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Layout: {option.layout}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {brief.goal === "catalog" && !!brief.catalogImageMapping?.length && (
                    <div className="space-y-3 rounded-2xl border bg-muted/20 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Atur ulang pemetaan gambar</p>
                            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">role dan halaman bisa diubah</span>
                        </div>
                        <div className="grid gap-3">
                            {(catalogEditableMappings || []).map((mapping) => (
                                <div key={mapping.image_id} className="rounded-xl border bg-background p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-foreground">{mapping.image_id}</p>
                                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{Math.round(mapping.confidence * 100)}%</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {["cover_image", "product_image", "service_image", "detail_image", "supporting_image"].map((option) => (
                                            <button
                                                key={`${mapping.image_id}-${option}`}
                                                type="button"
                                                onClick={() => onCatalogMappingCategoryChange(mapping.image_id, option)}
                                                className={`rounded-full border px-3 py-1 text-xs ${mapping.category === option ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3">
                                        <Input
                                            value={mapping.recommended_pages.join(", ")}
                                            onChange={(event) => onCatalogMappingPagesChange(mapping.image_id, event.target.value)}
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
                                        onChange={(event) => onCatalogPageTitleChange(page.page_number, event.target.value)}
                                        aria-label={`Judul halaman katalog ${page.page_number}`}
                                    />
                                </div>
                            ))}
                        </div>
                        {catalogRefreshError && <p className="text-xs text-destructive">{catalogRefreshError}</p>}
                        <Button type="button" variant="outline" onClick={onRefreshCatalogPlan} disabled={isRefreshingCatalogPlan || hasInvalidMapping}>
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
                                    {(["auto", "human", "object"] as const).map((focus) => (
                                        <button
                                            key={focus}
                                            type="button"
                                            onClick={() => setReferenceFocus(focus)}
                                            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${referenceFocus === focus ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted/60"}`}
                                        >
                                            {focus === "auto" ? "Auto" : focus === "human" ? "Orang" : "Objek"}
                                        </button>
                                    ))}
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
    );
}

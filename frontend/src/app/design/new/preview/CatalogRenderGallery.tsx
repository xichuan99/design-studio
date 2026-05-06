"use client";

import Image from "next/image";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogRenderStatusResponse } from "@/lib/api/types";

interface CatalogRenderGalleryProps {
    result: CatalogRenderStatusResponse;
    handoffLoading: boolean;
    onOpenInEditor: (args: { resultUrl: string; sourceTool: string; title: string; intent: string; entryMode: string }) => void;
}

export function CatalogRenderGallery({ result, handoffLoading, onOpenInEditor }: CatalogRenderGalleryProps) {
    return (
        <section className="space-y-4 rounded-3xl border bg-muted/20 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Render katalog selesai</p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                        {result.progress.completed_pages} dari {result.progress.total_pages} halaman berhasil dirender
                    </h2>
                </div>
                {result.zip_url && (
                    <a
                        href={result.zip_url}
                        download="catalog-pages.zip"
                        className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Unduh semua halaman (ZIP)
                    </a>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {result.pages.map((page) => (
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
                                            onOpenInEditor({
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
    );
}

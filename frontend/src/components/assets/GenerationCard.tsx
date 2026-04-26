"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, LinkIcon, Loader2, Check } from "lucide-react";
import Image from "next/image";
import { AiGeneration } from "@/lib/api/types";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GenerationCardProps {
    generation: AiGeneration;
    onDelete: (id: string) => Promise<void>;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
}

export function GenerationCard({
    generation,
    onDelete,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
}: GenerationCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConform, setShowDeleteConfirm] = useState(false);

    const isLinkedToProject = !!generation.project_id;

    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = generation.result_url;
        a.download = `design-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const label = generation.raw_text
        ? generation.raw_text.slice(0, 40) + (generation.raw_text.length > 40 ? "…" : "")
        : "Hasil Visual";

    const date = new Date(generation.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const toggleSelect = () => {
        onToggleSelect?.(generation.id);
    };

    return (
        <Card
            className={`group relative overflow-hidden border-border/50 bg-card transition-colors ${
                isSelectionMode
                    ? `${isSelected ? "ring-2 ring-primary border-primary/70" : "hover:border-primary/40"}`
                    : "hover:border-primary/40"
            }`}
            onClick={isSelectionMode ? toggleSelect : undefined}
            role={isSelectionMode ? "button" : undefined}
            tabIndex={isSelectionMode ? 0 : undefined}
            onKeyDown={
                isSelectionMode
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleSelect();
                          }
                      }
                    : undefined
            }
            aria-label={isSelectionMode ? "Pilih hasil visual" : undefined}
        >
            {/* Thumbnail */}
            <div className="aspect-square bg-muted relative overflow-hidden">
                <Image
                    src={generation.result_url}
                    alt={label}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized={generation.result_url.startsWith('http')}
                />

                {isSelectionMode ? (
                    <button
                        type="button"
                        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-black/50 border-white/50 text-white"
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect();
                        }}
                        aria-label={isSelected ? "Batalkan pilihan hasil visual" : "Pilih hasil visual"}
                    >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                ) : (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {isLinkedToProject && (
                            <Button variant="secondary" size="sm" className="w-32 gap-2 text-xs" asChild>
                                <Link href={`/edit/${generation.project_id}`}>
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Buka Project
                                </Link>
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-32 gap-2 text-xs"
                            onClick={handleDownload}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-32 gap-2 text-xs font-semibold bg-red-600/90 hover:bg-red-600 text-white"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Hapus
                        </Button>
                    </div>
                )}

                {/* Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none">
                    <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full font-medium border border-white/10 shadow-sm">
                        Visual AI
                    </span>
                    {isLinkedToProject && (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-500/90 text-white px-2 py-0.5 rounded-full font-medium shadow-sm backdrop-blur-sm">
                            <LinkIcon className="w-3 h-3" />
                            Digunakan
                        </span>
                    )}
                </div>
            </div>

            {/* Meta */}
            <div className="p-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground truncate" title={label}>
                    {label}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{date}</p>
                {isSelectionMode && isSelected && <p className="text-[10px] text-primary mt-1">Terpilih</p>}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteConform && !isSelectionMode} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus hasil visual ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isLinkedToProject 
                                ? "Hasil ini tampaknya sudah Anda jadikan proyek di editor. Menghapus file aslinya akan mengosongkan storage, tetapi Anda tidak bisa mengunduh file mentahnya lagi dari sini. Proyek Anda tetap aman."
                                : "Aset ini akan dihapus permanen dan membebaskan kuota storage Anda. Tindakan ini tidak dapat dibatalkan."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async (e) => {
                                e.preventDefault();
                                setIsDeleting(true);
                                try {
                                    await onDelete(generation.id);
                                } catch (error) {
                                    console.error(error);
                                } finally {
                                    setIsDeleting(false);
                                    setShowDeleteConfirm(false);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

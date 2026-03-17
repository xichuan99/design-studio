"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAiToolsEndpoints } from "@/lib/api/aiToolsApi";
import { AiToolResult } from "@/lib/api/types";
import { AssetCard } from "@/components/assets/AssetCard";
import { Loader2, FolderOpen } from "lucide-react";

const FILTERS = [
    { label: "Semua", value: "" },
    { label: "BG Swap", value: "background_swap" },
    { label: "Upscale", value: "upscale" },
    { label: "Retouch", value: "retouch" },
    { label: "Pasfoto", value: "id_photo" },
    { label: "Magic Eraser", value: "magic_eraser" },
    { label: "Expand", value: "generative_expand" },
    { label: "Watermark", value: "watermark" },
    { label: "Product Scene", value: "product_scene" },
];

export function AssetGrid() {
    const { getMyToolResults, deleteToolResult } = useAiToolsEndpoints();
    const [results, setResults] = useState<AiToolResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("");

    // Stable refs to avoid infinite loops
    const getMyToolResultsRef = useRef(getMyToolResults);
    const deleteToolResultRef = useRef(deleteToolResult);
    getMyToolResultsRef.current = getMyToolResults;
    deleteToolResultRef.current = deleteToolResult;

    const loadResults = useCallback(async (toolName: string) => {
        setLoading(true);
        try {
            const data = await getMyToolResultsRef.current(
                toolName || undefined,
                100,
                0
            );
            setResults(data);
        } catch (err) {
            console.error("Failed to load assets:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadResults(activeFilter);
    }, [activeFilter, loadResults]);

    const handleDelete = async (id: string) => {
        await deleteToolResultRef.current(id);
        setResults((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setActiveFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            activeFilter === f.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm">Memuat aset...</p>
                </div>
            ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">Belum ada aset</p>
                        <p className="text-xs mt-1">
                            {activeFilter
                                ? "Tidak ada hasil untuk filter ini."
                                : "Hasil AI Tools Anda akan tersimpan otomatis di sini."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {results.map((r) => (
                        <AssetCard key={r.id} result={r} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}

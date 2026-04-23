"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAiToolsEndpoints } from "@/lib/api/aiToolsApi";
import { AiToolResult, AiGeneration } from "@/lib/api/types";
import { AssetCard } from "@/components/assets/AssetCard";
import { GenerationCard } from "@/components/assets/GenerationCard";
import { Loader2, FolderOpen } from "lucide-react";

const TOOL_FILTERS = [
    { label: "Semua", value: "" },
    { label: "BG Swap", value: "background_swap" },
    { label: "Retouch", value: "retouch" },
    { label: "Pasfoto", value: "id_photo" },
    { label: "Magic Eraser", value: "magic_eraser" },
    { label: "Expand", value: "generative_expand" },
    { label: "Watermark", value: "watermark" },
    { label: "Product Scene", value: "product_scene" },
];

const TABS = [
    { id: "tools", label: "AI Tools" },
    { id: "generations", label: "Hasil Visual" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
                <p className="text-sm font-medium text-foreground">Belum ada aset</p>
                <p className="text-xs mt-1">{message}</p>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Memuat aset...</p>
        </div>
    );
}

export function AssetGrid({ selectedFolderId }: { selectedFolderId?: string | null }) {
    const { getMyToolResults, deleteToolResult, getMyGenerations, deleteGeneration } = useAiToolsEndpoints();
    const [activeTab, setActiveTab] = useState<TabId>("tools");
    const [toolResults, setToolResults] = useState<AiToolResult[]>([]);
    const [generations, setGenerations] = useState<AiGeneration[]>([]);
    const [loadingTools, setLoadingTools] = useState(true);
    const [loadingGenerations, setLoadingGenerations] = useState(true);
    const [activeFilter, setActiveFilter] = useState("");

    // Stable refs to avoid infinite loops
    const getMyToolResultsRef = useRef(getMyToolResults);
    const deleteToolResultRef = useRef(deleteToolResult);
    const getMyGenerationsRef = useRef(getMyGenerations);
    const deleteGenerationRef = useRef(deleteGeneration);
    getMyToolResultsRef.current = getMyToolResults;
    deleteToolResultRef.current = deleteToolResult;
    getMyGenerationsRef.current = getMyGenerations;
    deleteGenerationRef.current = deleteGeneration;

    const loadToolResults = useCallback(async (toolName: string) => {
        setLoadingTools(true);
        try {
            const data = await getMyToolResultsRef.current(toolName || undefined, 100, 0, selectedFolderId);
            setToolResults(data);
        } catch (err) {
            console.error("Failed to load tool results:", err);
        } finally {
            setLoadingTools(false);
        }
    }, [selectedFolderId]);

    const loadGenerations = useCallback(async () => {
        setLoadingGenerations(true);
        try {
            const data = await getMyGenerationsRef.current(100, 0, selectedFolderId);
            setGenerations(data);
        } catch (err) {
            console.error("Failed to load generations:", err);
        } finally {
            setLoadingGenerations(false);
        }
    }, [selectedFolderId]);

    useEffect(() => {
        loadToolResults(activeFilter);
    }, [activeFilter, loadToolResults]);

    useEffect(() => {
        loadGenerations();
    }, [loadGenerations]);

    const handleDeleteTool = async (id: string) => {
        await deleteToolResultRef.current(id);
        setToolResults((prev) => prev.filter((r) => r.id !== id));
    };

    const handleDeleteGeneration = async (id: string) => {
        await deleteGenerationRef.current(id);
        setGenerations((prev) => prev.filter((g) => g.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-border/50 gap-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                        {tab.id === "tools" && !loadingTools && (
                            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                {toolResults.length}
                            </span>
                        )}
                        {tab.id === "generations" && !loadingGenerations && (
                            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                {generations.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* AI Tools tab */}
            {activeTab === "tools" && (
                <div className="space-y-5">
                    {/* Filter chips */}
                    <div className="flex flex-wrap gap-2">
                        {TOOL_FILTERS.map((f) => (
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

                    {loadingTools ? (
                        <LoadingState />
                    ) : toolResults.length === 0 ? (
                        <EmptyState
                            message={
                                activeFilter
                                    ? "Tidak ada hasil untuk filter ini."
                                    : "Hasil AI Tools Anda akan tersimpan otomatis di sini."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {toolResults.map((r) => (
                                <AssetCard key={r.id} result={r} onDelete={handleDeleteTool} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Design generations tab */}
            {activeTab === "generations" && (
                <div className="space-y-5">
                    {loadingGenerations ? (
                        <LoadingState />
                    ) : generations.length === 0 ? (
                        <EmptyState message="Desain yang Anda buat via AI akan muncul di sini." />
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {generations.map((g) => (
                                <GenerationCard key={g.id} generation={g} onDelete={handleDeleteGeneration} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

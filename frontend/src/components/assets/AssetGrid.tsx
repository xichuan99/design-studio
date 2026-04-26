"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAiToolsEndpoints } from "@/lib/api/aiToolsApi";
import { AiToolResult, AiGeneration } from "@/lib/api/types";
import { AssetCard } from "@/components/assets/AssetCard";
import { GenerationCard } from "@/components/assets/GenerationCard";
import { Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

interface AssetGridProps {
    selectedFolderId?: string | null;
    initialTab?: TabId;
    projectFilterId?: string | null;
    onClearProjectFilter?: () => void;
}

export function AssetGrid({
    selectedFolderId,
    initialTab = "tools",
    projectFilterId,
    onClearProjectFilter,
}: AssetGridProps) {
    const { getMyToolResults, deleteToolResult, getMyGenerations, deleteGeneration } = useAiToolsEndpoints();
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const [toolResults, setToolResults] = useState<AiToolResult[]>([]);
    const [generations, setGenerations] = useState<AiGeneration[]>([]);
    const [loadingTools, setLoadingTools] = useState(true);
    const [loadingGenerations, setLoadingGenerations] = useState(true);
    const [activeFilter, setActiveFilter] = useState("");
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
    const [selectedGenerationIds, setSelectedGenerationIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        setIsSelectionMode(false);
        setSelectedToolIds(new Set());
        setSelectedGenerationIds(new Set());
    }, [activeTab, activeFilter, selectedFolderId]);

    const handleDeleteTool = async (id: string) => {
        await deleteToolResultRef.current(id);
        setToolResults((prev) => prev.filter((r) => r.id !== id));
    };

    const handleDeleteGeneration = async (id: string) => {
        await deleteGenerationRef.current(id);
        setGenerations((prev) => prev.filter((g) => g.id !== id));
    };

    const toggleToolSelection = (id: string) => {
        setSelectedToolIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleGenerationSelection = (id: string) => {
        setSelectedGenerationIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const visibleToolIds = toolResults.map((item) => item.id);
    const filteredGenerations = projectFilterId
        ? generations.filter((item) => item.project_id === projectFilterId)
        : generations;
    const visibleGenerationIds = filteredGenerations.map((item) => item.id);
    const selectedCount = activeTab === "tools" ? selectedToolIds.size : selectedGenerationIds.size;

    const clearSelection = () => {
        setSelectedToolIds(new Set());
        setSelectedGenerationIds(new Set());
    };

    const handleSelectAllVisible = () => {
        if (activeTab === "tools") {
            setSelectedToolIds(new Set(visibleToolIds));
            return;
        }
        setSelectedGenerationIds(new Set(visibleGenerationIds));
    };

    const handleBulkDelete = async () => {
        const selectedIds = activeTab === "tools" ? Array.from(selectedToolIds) : Array.from(selectedGenerationIds);
        if (selectedIds.length === 0 || isBulkDeleting) return;

        const confirmDelete = window.confirm(
            `Hapus ${selectedIds.length} aset terpilih? Kuota storage dari file yang berhasil dihapus akan dikembalikan.`
        );
        if (!confirmDelete) return;

        setIsBulkDeleting(true);
        try {
            const results = await Promise.allSettled(
                selectedIds.map((id) =>
                    activeTab === "tools" ? deleteToolResultRef.current(id) : deleteGenerationRef.current(id)
                )
            );

            const successIds = results
                .map((result, index) => ({ result, id: selectedIds[index] }))
                .filter((item) => item.result.status === "fulfilled")
                .map((item) => item.id);

            const failedIds = results
                .map((result, index) => ({ result, id: selectedIds[index] }))
                .filter((item) => item.result.status === "rejected")
                .map((item) => item.id);

            if (activeTab === "tools") {
                setToolResults((prev) => prev.filter((item) => !successIds.includes(item.id)));
                setSelectedToolIds(new Set(failedIds));
            } else {
                setGenerations((prev) => prev.filter((item) => !successIds.includes(item.id)));
                setSelectedGenerationIds(new Set(failedIds));
            }

            if (failedIds.length === 0) {
                toast.success(`${successIds.length} aset berhasil dihapus.`);
                setIsSelectionMode(false);
            } else if (successIds.length > 0) {
                toast.warning(`${successIds.length} aset terhapus, ${failedIds.length} aset gagal dihapus.`);
            } else {
                toast.error("Gagal menghapus aset terpilih. Silakan coba lagi.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Terjadi kesalahan saat menghapus aset terpilih.");
        } finally {
            setIsBulkDeleting(false);
        }
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
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
                        <Button
                            variant={isSelectionMode ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                                if (isSelectionMode) {
                                    setIsSelectionMode(false);
                                    clearSelection();
                                    return;
                                }
                                setIsSelectionMode(true);
                            }}
                        >
                            {isSelectionMode ? "Selesai Pilih" : "Pilih"}
                        </Button>
                    </div>

                    {isSelectionMode && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
                            <span className="text-xs text-muted-foreground">{selectedCount} terpilih</span>
                            <Button variant="outline" size="sm" onClick={handleSelectAllVisible}>
                                Pilih Semua Terlihat
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearSelection}>
                                Bersihkan
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={selectedCount === 0 || isBulkDeleting}
                                onClick={handleBulkDelete}
                            >
                                {isBulkDeleting ? "Menghapus..." : "Hapus Terpilih"}
                            </Button>
                        </div>
                    )}

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
                                <AssetCard
                                    key={r.id}
                                    result={r}
                                    onDelete={handleDeleteTool}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedToolIds.has(r.id)}
                                    onToggleSelect={toggleToolSelection}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Design generations tab */}
            {activeTab === "generations" && (
                <div className="space-y-5">
                    {projectFilterId ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                            <span className="font-medium text-foreground">Filter project aktif</span>
                            <span className="text-muted-foreground">{projectFilterId}</span>
                            {onClearProjectFilter ? (
                                <Button variant="outline" size="sm" className="h-7" onClick={onClearProjectFilter}>
                                    Tampilkan Semua
                                </Button>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex items-center justify-end">
                        <Button
                            variant={isSelectionMode ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                                if (isSelectionMode) {
                                    setIsSelectionMode(false);
                                    clearSelection();
                                    return;
                                }
                                setIsSelectionMode(true);
                            }}
                        >
                            {isSelectionMode ? "Selesai Pilih" : "Pilih"}
                        </Button>
                    </div>

                    {isSelectionMode && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
                            <span className="text-xs text-muted-foreground">{selectedCount} terpilih</span>
                            <Button variant="outline" size="sm" onClick={handleSelectAllVisible}>
                                Pilih Semua Terlihat
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearSelection}>
                                Bersihkan
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={selectedCount === 0 || isBulkDeleting}
                                onClick={handleBulkDelete}
                            >
                                {isBulkDeleting ? "Menghapus..." : "Hapus Terpilih"}
                            </Button>
                        </div>
                    )}

                    {loadingGenerations ? (
                        <LoadingState />
                    ) : filteredGenerations.length === 0 ? (
                        <EmptyState
                            message={
                                projectFilterId
                                    ? "Belum ada hasil visual yang terhubung ke proyek ini."
                                    : "Desain yang Anda buat via AI akan muncul di sini."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredGenerations.map((g) => (
                                <GenerationCard
                                    key={g.id}
                                    generation={g}
                                    onDelete={handleDeleteGeneration}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedGenerationIds.has(g.id)}
                                    onToggleSelect={toggleGenerationSelection}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

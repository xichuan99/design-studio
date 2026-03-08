"use client";

import React, { useEffect, useState } from 'react';
import { useProjectApi } from '@/lib/api';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Loader2, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryEntry {
    id: string;
    project_id: string;
    background_url: string;
    text_layers: Record<string, unknown>;
    generation_params: Record<string, unknown> | null;
    created_at: string;
}

interface HistoryPanelProps {
    projectId: string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ projectId }) => {
    const { getHistory } = useProjectApi();
    const { loadState } = useCanvasStore();
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await getHistory(projectId);
                setEntries(data);
            } catch (err) {
                console.error('Failed to load history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleRestore = (entry: HistoryEntry) => {
        if (!confirm('Restore design ini? Perubahan saat ini akan hilang.')) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elements = (entry.text_layers as any)?.elements || [];
        loadState(elements, entry.background_url || null);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Riwayat Desain</h3>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : entries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                    Belum ada riwayat untuk project ini
                </p>
            ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors"
                        >
                            {/* Thumbnail */}
                            {entry.background_url && (
                                <div className="aspect-video rounded overflow-hidden mb-2 bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={entry.background_url}
                                        alt="History snapshot"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">
                                    {formatDate(entry.created_at)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => handleRestore(entry)}
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Restore
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

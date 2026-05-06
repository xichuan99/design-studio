"use client";

import Image from "next/image";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { Check, Download, Import, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCanvasStore } from "@/store/useCanvasStore";
import { IMPORT_QUEUE_KEY, type ImportQueueItem } from "@/lib/import-queue";

export { IMPORT_QUEUE_KEY, type ImportQueueItem } from "@/lib/import-queue";

interface ImportQueueDialogProps {
    open: boolean;
    items: ImportQueueItem[];
    canvasWidth: number;
    canvasHeight: number;
    onClose: () => void;
}

export function ImportQueueDialog({
    open,
    items,
    canvasWidth,
    canvasHeight,
    onClose,
}: ImportQueueDialogProps) {
    const { addElement } = useCanvasStore();
    const posthog = usePostHog();

    useEffect(() => {
        if (!open || items.length === 0) return;
        posthog?.capture("import_queue_dialog_opened", { item_count: items.length });
    }, [items.length, open, posthog]);

    const importItem = (item: ImportQueueItem, offset = 0) => {
        const imgW = Math.round(canvasWidth * 0.4);
        const imgH = Math.round(canvasHeight * 0.4);
        addElement({
            type: "image",
            url: item.url,
            x: 40 + offset * 24,
            y: 40 + offset * 24,
            width: imgW,
            height: imgH,
            rotation: 0,
            opacity: 1,
        });
    };

    const handleImportAll = () => {
        posthog?.capture("import_queue_import_all_clicked", { item_count: items.length });
        items.forEach((item, i) => importItem(item, i));
        localStorage.removeItem(IMPORT_QUEUE_KEY);
        onClose();
    };

    const handleImportOne = (item: ImportQueueItem, idx: number) => {
        posthog?.capture("import_queue_import_single_clicked", { index: idx, filename: item.filename });
        importItem(item, idx);
        // Remove this item from queue in localStorage
        try {
            const saved = localStorage.getItem(IMPORT_QUEUE_KEY);
            if (saved) {
                const queue: ImportQueueItem[] = JSON.parse(saved);
                const updated = queue.filter((_, i) => i !== idx);
                if (updated.length === 0) {
                    localStorage.removeItem(IMPORT_QUEUE_KEY);
                } else {
                    localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(updated));
                }
            }
        } catch {
            // ignore
        }
        if (items.length <= 1) onClose();
    };

    const handleDismiss = () => {
        posthog?.capture("import_queue_dialog_skipped", { item_count: items.length });
        localStorage.removeItem(IMPORT_QUEUE_KEY);
        onClose();
    };

    if (!open || items.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Import className="h-5 w-5 text-primary" />
                        {items.length} foto siap diimport ke canvas
                    </DialogTitle>
                    <DialogDescription>
                        Foto-foto ini berasal dari proses batch sebelumnya. Kamu bisa import semua sekaligus atau pilih satu per satu.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-80 overflow-y-auto py-1 pr-1">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="group relative rounded-xl border bg-muted/20 overflow-hidden"
                        >
                            <div className="aspect-square relative">
                                <Image
                                    src={item.url}
                                    alt={item.filename}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <button
                                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                                        title="Import ke canvas"
                                        onClick={() => handleImportOne(item, idx)}
                                    >
                                        <Check className="h-4 w-4 text-foreground" />
                                    </button>
                                    <button
                                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                                        title="Unduh"
                                        onClick={() => window.open(item.url, "_blank")}
                                    >
                                        <Download className="h-4 w-4 text-foreground" />
                                    </button>
                                </div>
                            </div>
                            <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{item.filename}</p>
                        </div>
                    ))}
                </div>

                <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleDismiss}>
                        <X className="h-4 w-4" /> Lewati
                    </Button>
                    <Button className="gap-2" onClick={handleImportAll}>
                        <Import className="h-4 w-4" />
                        Import semua ({items.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

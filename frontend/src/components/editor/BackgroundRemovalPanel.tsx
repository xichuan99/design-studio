"use client";

import React, { useState, useRef } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useProjectApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Scissors, Upload, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MAX_FILE_SIZE } from "@/app/create/types";
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { CreditConfirmDialog } from '@/components/credits/CreditConfirmDialog';
import Image from "next/image";

export function BackgroundRemovalPanel() {
    const { addElement, elements, canvasWidth, canvasHeight, setActiveSidebarTab, setHandoffData } = useCanvasStore();
    const { removeBackground } = useProjectApi();
    const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
    const [processedImagePreview, setProcessedImagePreview] = useState<string | null>(null);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setErrorMsg("Hanya file gambar yang diperbolehkan.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setErrorMsg(`Ukuran file maksimal ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
            return;
        }

        setErrorMsg("");
        setIsProcessing(true);
        setOriginalImagePreview(URL.createObjectURL(file));
        setProcessedImagePreview(null);
        setProcessedImageUrl(null);

        try {
            const result = await removeBackground(file);
            setProcessedImageUrl(result.url);
            setProcessedImagePreview(result.url); // Use the URL from backend as preview
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : "Gagal menghapus background.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isProcessing) return;
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const getSmartPosition = () => {
        const baseX = canvasWidth ? canvasWidth / 2 - 100 : 300;
        const baseY = canvasHeight ? canvasHeight / 2 - 100 : 300;
        const offset = (elements.length % 5) * 30;
        return { x: baseX + offset, y: baseY + offset };
    };

    const [isHandoffLoading, setIsHandoffLoading] = useState(false);

    const handleJadikanIklan = async () => {
        if (!processedImageUrl) return;
        setIsHandoffLoading(true);
        try {
            const response = await fetch(processedImageUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            
            await new Promise<void>((resolve, reject) => {
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    setHandoffData({ imageBase64: base64data, source: 'bgremoval' });
                    setActiveSidebarTab('aistudio');
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("Failed to convert image for handoff", err);
            toast.error("Gagal menyiapkan gambar untuk iklan. Silakan coba lagi.");
        } finally {
            setIsHandoffLoading(false);
        }
    };

    const handleAddToCanvas = () => {
        if (!processedImageUrl) return;
        const pos = getSmartPosition();
        addElement({
            type: "image",
            x: pos.x,
            y: pos.y,
            width: 300,
            height: 300,
            url: processedImageUrl,
            rotation: 0,
        });
    };

    const resetPanel = () => {
        if (originalImagePreview) URL.revokeObjectURL(originalImagePreview);
        setOriginalImagePreview(null);
        setProcessedImagePreview(null);
        setProcessedImageUrl(null);
        setErrorMsg("");
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h2 className="font-semibold flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-primary" /> Hapus Background
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Upload foto produk, AI akan otomatis memisahkan objek dari latar belakang.
                    </p>
                </div>
                <CreditCostBadge cost={10} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {errorMsg && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                        {errorMsg}
                    </div>
                )}

                {!originalImagePreview && !isProcessing && (
                    <CreditConfirmDialog
                        title="Hapus Background"
                        description="AI akan menghapus latar belakang gambar. Biaya untuk operasi ini adalah 10 kredit."
                        cost={10}
                        onConfirm={() => fileInputRef.current?.click()}
                    >
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Upload className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Klik atau drop gambar</p>
                                <p className="text-xs text-muted-foreground mt-1">Maks 10MB (JPG/PNG)</p>
                            </div>
                        </div>
                    </CreditConfirmDialog>
                )}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                />

                {isProcessing && (
                    <div className="border rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-muted/30">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-sm font-medium">AI sedang memisahkan objek...</p>
                            <p className="text-xs text-muted-foreground mt-1">Proses ini memakan waktu beberapa detik</p>
                        </div>
                    </div>
                )}

                {!isProcessing && processedImagePreview && (
                    <div className="space-y-4">
                        <div className="relative border rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center p-4 min-h-[250px]">
                            {/* Grid background to show transparency */}
                            <div className="absolute inset-0 z-0" style={{
                                backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%)`,
                                backgroundSize: `20px 20px`,
                                backgroundPosition: `0 0, 10px 0, 10px -10px, 0px 10px`,
                                opacity: 0.2
                            }} />
                            <Image 
                                src={processedImagePreview} 
                                alt="Processed" 
                                fill
                                className="object-contain p-4 relative z-10" 
                                unoptimized
                            />
                        </div>

                        <div className="flex flex-col gap-2 p-1 bg-muted/20 border rounded-xl overflow-hidden shadow-sm">
                            <Button 
                                onClick={handleJadikanIklan} 
                                className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                disabled={isHandoffLoading}
                            >
                                {isHandoffLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Sparkles className="w-5 h-5 mr-2" />
                                )}
                                Lanjutkan ke Konsep Visual
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={handleAddToCanvas} variant="outline" size="sm" className="h-10 text-xs">
                                    <Plus className="w-4 h-4 mr-2" /> Taruh di Canvas
                                </Button>
                                <Button onClick={resetPanel} variant="ghost" size="sm" className="h-10 text-xs">
                                    Foto Lain
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


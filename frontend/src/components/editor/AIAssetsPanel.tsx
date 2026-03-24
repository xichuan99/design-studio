"use client";

import React, { useEffect, useRef, useState } from "react";
import { useProjectApi } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";
import { Loader2, Wallpaper, ImagePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';

interface AIGeneration {
    id: string;
    result_url: string;
    visual_prompt: string;
    raw_text: string;
    created_at: string;
}

export const AIAssetsPanel: React.FC = () => {
    const { getMyGenerations } = useProjectApi();
    const { setBackgroundUrl, addElement } = useCanvasStore();

    const [assets, setAssets] = useState<AIGeneration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingBgRemovalAsset, setPendingBgRemovalAsset] = useState<string | null>(null);

    // Stabilize function ref to prevent infinite re-fetch loop
    const getMyGenerationsRef = useRef(getMyGenerations);
    useEffect(() => {
        getMyGenerationsRef.current = getMyGenerations;
    });

    useEffect(() => {
        const fetchAssets = async () => {
            setLoading(true);
            try {
                const data = await getMyGenerationsRef.current(30, 0);
                setAssets(data);
            } catch (err: unknown) {
                console.error("Failed to load AI assets:", err);
                setError(err instanceof Error ? err.message : "Gagal memuat galeri AI");
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, []); // empty deps — runs once on mount

    const handleSetAsBackground = (url: string) => {
        setBackgroundUrl(url);
    };

    const handleAddAsElement = async (url: string) => {
        // Prepare proxy for measuring native image
        const proxyUrl = url.startsWith('http')
            ? `/api/proxy-image?url=${encodeURIComponent(url)}`
            : url;
            
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = proxyUrl;
        
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        const maxSize = 400;
        const originalWidth = img.naturalWidth || 1024;
        const originalHeight = img.naturalHeight || 1024;
        const scale = Math.min(
            maxSize / originalWidth,
            maxSize / originalHeight,
            1
        );

        addElement({
            type: 'image',
            x: 100,
            y: 100,
            width: originalWidth * scale,
            height: originalHeight * scale,
            url: url,
            rotation: 0,
            label: 'AI Generated',
        });
    };

    const handleConfirmBgRemoval = async () => {
        if (!pendingBgRemovalAsset) return;
        try {
            const response = await fetch(pendingBgRemovalAsset);
            const blob = await response.blob();
            const tempUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = tempUrl;
            a.download = "to_remove_bg.jpg";
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Gambar berhasil di-download. Buka tab 'Hapus BG' dan upload gambar ini.", { duration: 5000 });
        } catch (e) {
            console.error(e);
            toast.error("Gagal mengunduh gambar.");
        }
        setPendingBgRemovalAsset(null);
    };

    if (loading && assets.length === 0) {
        return (
            <div className="flex flex-col h-full bg-card p-4 items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-xs">Memuat aset Anda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full bg-card p-4 items-center justify-center text-destructive">
                <p className="text-xs text-center">{error}</p>
            </div>
        );
    }

    if (assets.length === 0) {
        return (
            <div className="flex flex-col h-full bg-card p-4 items-center justify-center text-muted-foreground text-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary/50" />
                </div>
                <p className="text-sm font-medium">Belum ada hasil AI</p>
                <p className="text-xs px-4">Gambar yang Anda generate melalui tab AI akan muncul dan tersimpan secara otomatis di sini.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-4">
            <div className="flex items-center gap-2 border-b pb-4 shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">Aset AI Saya</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="grid grid-cols-2 gap-3 pb-8">
                    {assets.map((asset) => {
                        const previewUrl = asset.result_url?.startsWith('http')
                            ? `/api/proxy-image?url=${encodeURIComponent(asset.result_url)}`
                            : asset.result_url;
                            
                        return (
                            <div key={asset.id} className="group relative rounded-xl border bg-muted/30 overflow-hidden aspect-square">
                                <Image 
                                    src={previewUrl || ''} 
                                    alt="AI Gen" 
                                    fill
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    crossOrigin="anonymous"
                                    title={asset.visual_prompt || asset.raw_text}
                                    unoptimized={previewUrl?.startsWith('http')}
                                />
                                {/* Hover Actions Overlay */}
                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-2 group-hover:translate-y-0">
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        className="h-7 text-[10px] w-full gap-1.5 bg-black/50 hover:bg-black/70 text-white border-0"
                                        onClick={() => setPendingBgRemovalAsset(previewUrl || asset.result_url)}
                                        title="Download untuk Dihapus Background-nya"
                                    >
                                        Hapus BG
                                    </Button>
                                    <div className="flex gap-1">
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="h-7 text-[10px] w-full gap-1.5"
                                            onClick={() => handleSetAsBackground(asset.result_url)}
                                            title="Jadikan Background Canvas"
                                        >
                                            <Wallpaper className="w-3 h-3" /> Bg
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="h-7 text-[10px] w-full gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground"
                                            onClick={() => handleAddAsElement(asset.result_url)}
                                            title="Tambah sebagai Elemen"
                                        >
                                            <ImagePlus className="w-3 h-3" /> Tambah
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!pendingBgRemovalAsset}
                onOpenChange={(isOpen) => !isOpen && setPendingBgRemovalAsset(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Background?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Gambar akan diunduh sehingga Anda dapat mengunggahnya ke tab Hapus BG. Lanjutkan?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmBgRemoval}>
                            Unduh Gambar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

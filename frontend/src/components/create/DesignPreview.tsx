import React, { useEffect, useState } from "react";
import { ImagePlus, Maximize2, X } from "lucide-react";
import Image from "next/image";

interface DesignPreviewProps {
    imageUrl: string | null;
}

export function DesignPreview({ imageUrl }: DesignPreviewProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!isFullscreen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    if (!imageUrl) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="max-w-md rounded-3xl border border-dashed border-border/70 bg-background/70 p-8 text-center shadow-sm backdrop-blur-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ImagePlus className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">Hasil pertama akan muncul di sini</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Setelah AI selesai menyiapkan visual, Anda bisa membandingkan hasilnya di area ini lalu lanjut ke editor untuk sentuhan akhir.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Normal Preview — fits within parent without scrolling */}
            <div className="relative flex items-center justify-center group w-full h-full min-h-[300px]">
                <Image
                    src={imageUrl}
                    alt="Generated Design"
                    fill
                    className="object-contain rounded-xl shadow-2xl drop-shadow-lg group-hover:scale-[1.005] transition-transform duration-700 ease-out cursor-pointer"
                    onClick={() => setIsFullscreen(true)}
                    unoptimized={imageUrl.startsWith('http')}
                />
                {/* Fullscreen hint */}
                <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    title="Lihat layar penuh"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Fullscreen Overlay */}
            {isFullscreen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer animate-in fade-in duration-200"
                    onClick={() => setIsFullscreen(false)}
                >
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center">
                        <Image
                            src={imageUrl}
                            alt="Preview desain layar penuh"
                            fill
                            className="object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            unoptimized={imageUrl.startsWith('http')}
                        />
                    </div>
                </div>
            )}
        </>
    );
}

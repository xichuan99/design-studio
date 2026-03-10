import React, { useState } from "react";
import { Maximize2, X } from "lucide-react";

interface DesignPreviewProps {
    imageUrl: string | null;
}

export function DesignPreview({ imageUrl }: DesignPreviewProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!imageUrl) return null;

    return (
        <>
            {/* Normal Preview — fits within parent without scrolling */}
            <div className="relative flex items-center justify-center group w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt="Generated Design"
                    className="w-full h-full object-contain rounded-xl shadow-2xl drop-shadow-lg group-hover:scale-[1.005] transition-transform duration-700 ease-out cursor-pointer"
                    onClick={() => setIsFullscreen(true)}
                />
                {/* Fullscreen hint */}
                <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    title="Lihat Fullscreen"
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Generated Design Fullscreen"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}

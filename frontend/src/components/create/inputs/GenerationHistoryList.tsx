import React from "react";
import { Check } from "lucide-react";

interface GenerationHistoryListProps {
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    setActiveImageIndex: (idx: number) => void;
}

export function GenerationHistoryList({
    imageHistory,
    activeImageIndex,
    setActiveImageIndex
}: GenerationHistoryListProps) {
    if (imageHistory.length <= 1) return null;

    return (
        <div className="flex-1 flex items-center overflow-x-auto gap-2 pb-1 scrollbar-thin scrollbar-thumb-border">
            {imageHistory.map((historyItem, idx) => (
                <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative shrink-0 w-14 h-14 rounded-md overflow-hidden transition-all ${
                        activeImageIndex === idx 
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105 opacity-100' 
                            : 'opacity-60 hover:opacity-100 hover:scale-105 border border-border/50'
                    }`}
                    title={historyItem.prompt || `Variasi ${idx + 1}`}
                    aria-label={`Pilih variasi ${idx + 1}`}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src={historyItem.url} 
                        alt={`Variation ${idx + 1}`}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                        V{idx + 1}
                    </div>
                    {activeImageIndex === idx && (
                        <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" />
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}

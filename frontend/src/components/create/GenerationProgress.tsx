import React from "react";
import { Sparkles } from "lucide-react";

interface GenerationProgressProps {
    isParsing: boolean;
    isGeneratingImage: boolean;
}

export function GenerationProgress({ isParsing, isGeneratingImage }: GenerationProgressProps) {
    return (
        <div className="max-w-2xl w-full mx-auto h-full flex flex-col items-center justify-center">
            <div className="text-center mb-10 space-y-4">
                <div className="inline-flex relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <div className="w-20 h-20 bg-background border-2 border-primary/20 rounded-2xl shadow-2xl flex items-center justify-center relative z-10">
                        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">AI Sedang Bekerja ✨</h2>
                <p className="text-muted-foreground">
                    {isParsing ? "Sedang membedah struktur teks promosi Anda..." : "Sedang memecahkan pixel untuk membuat gambar super HD..."}
                </p>
            </div>

            {/* Animated progress indicators */}
            <div className="w-full mb-4 bg-muted/50 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full transition-all duration-500 ease-out" style={{ width: isParsing ? '35%' : '85%' }} />
            </div>
            <div className="w-full max-w-md space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isParsing ? 'bg-primary animate-ping' : 'bg-primary'}`} /> Analisis Semantik</span>
                    <span className="text-muted-foreground">{isParsing ? 'Proses...' : 'Selesai ✓'}</span>
                </div>
                <div className="flex items-center justify-between text-sm opacity-80">
                    <span className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isGeneratingImage ? 'bg-primary animate-ping' : isParsing ? 'bg-muted-foreground' : 'bg-primary'}`} /> Generasi Gambar Flux</span>
                    <span className="text-muted-foreground">{isGeneratingImage ? 'Proses (~15 dtk)...' : isParsing ? 'Menunggu...' : 'Selesai ✓'}</span>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from "react";
import { CopywritingVariation } from "@/lib/api";
import { ParsedDesignData, VisualPromptPart } from "@/app/create/types";
import { VisualPromptEditor } from "./VisualPromptEditor";
import { Check, Sparkles, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnifiedResultsViewProps {
    copyVariations: CopywritingVariation[];
    parsedData: ParsedDesignData;
    onSelectCopy: (fullText: string) => void;
    onTogglePromptPart: (index: number) => void;
    onModifyPromptParts: (newParts: VisualPromptPart[], newCombined: string, newTranslation?: string) => void;
    onGenerate: () => void;
    isGeneratingImage: boolean;
}

export function UnifiedResultsView({
    copyVariations,
    parsedData,
    onSelectCopy,
    onTogglePromptPart,
    onModifyPromptParts,
    onGenerate,
    isGeneratingImage
}: UnifiedResultsViewProps) {
    const [selectedCopyIndex, setSelectedCopyIndex] = useState<number | null>(null);

    const handleCopySelect = (index: number, fullText: string) => {
        setSelectedCopyIndex(index);
        onSelectCopy(fullText);
    };

    return (
        <div className="w-full max-w-6xl mx-auto animation-fade-in flex flex-col gap-6">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Hasil Analisis AI
                </h2>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto mt-2">
                    Pilih teks promosi yang paling cocok, lalu sesuaikan arahan visual desainnya sebelum mulai di-generate.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Copywriting Variations */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                        <h3 className="font-semibold text-lg">Pilih Teks Promosi</h3>
                    </div>
                    
                    {copyVariations.length === 0 ? (
                        <div className="p-6 text-center border rounded-xl bg-muted/30">
                            <p className="text-muted-foreground text-sm">Tidak ada variasi teks tersedia. Lanjutkan ke langkah berikutnya.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {copyVariations.map((v, i) => (
                                <div 
                                    key={i} 
                                    className={`relative group bg-card border rounded-xl p-4 transition-all cursor-pointer overflow-hidden ${
                                        selectedCopyIndex === i 
                                        ? 'border-primary ring-1 ring-primary shadow-md bg-primary/5' 
                                        : 'hover:border-primary/50 hover:shadow-sm'
                                    }`}
                                    onClick={() => handleCopySelect(i, v.full_text)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded ${
                                            selectedCopyIndex === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {v.style}
                                        </span>
                                        {selectedCopyIndex === i && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center animation-zoom-in">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h5 className="font-bold text-sm text-foreground leading-snug mb-1 pr-6">{v.headline}</h5>
                                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{v.subline}</p>
                                    <p className="text-xs font-semibold text-primary/80">{v.cta}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Visual Prompt Editor */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
                        <h3 className="font-semibold text-lg">Sesuaikan Arahan Visual</h3>
                    </div>

                    <div className="bg-card shadow-lg rounded-2xl overflow-hidden border border-border/50">
                        <VisualPromptEditor
                            parsedData={parsedData}
                            onTogglePromptPart={onTogglePromptPart}
                            onModifyPromptParts={onModifyPromptParts}
                            onGenerate={onGenerate}
                            isGeneratingImage={isGeneratingImage}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

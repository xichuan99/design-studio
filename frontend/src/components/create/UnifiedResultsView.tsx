import React, { useState } from "react";
import { CopywritingVariation } from "@/lib/api";
import { ParsedDesignData, VisualPromptPart } from "@/app/create/types";
import { VisualPromptEditor } from "./VisualPromptEditor";
import { Check, Sparkles, Type, Wand2 } from "lucide-react";

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

    const hasCopyVariations = copyVariations && copyVariations.length > 0;

    return (
        <div className="w-full max-w-6xl mx-auto animation-fade-in flex flex-col gap-6">
            {/* Header */}
            <div className="text-center mb-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary tracking-wider uppercase">Hasil Analisis AI</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                    Sesuaikan Sebelum Generate
                </h2>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto mt-1">
                    Pilih teks promosi &amp; sesuaikan arahan visual untuk hasil desain terbaik.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Copywriting Variations */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xs shadow-sm">1</div>
                        <h3 className="font-semibold text-base">Pilih Teks Promosi</h3>
                    </div>
                    
                    {!hasCopyVariations ? (
                        <div className="p-6 text-center border border-dashed border-border rounded-xl bg-muted/20">
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                <Type className="w-5 h-5 text-muted-foreground/60" />
                            </div>
                            <p className="text-muted-foreground text-sm font-medium mb-1">Variasi teks sedang diproses...</p>
                            <p className="text-muted-foreground/70 text-xs">AI copywriting sedang merangkai kata-kata. Anda bisa langsung lanjut ke langkah visual di sebelah kanan.</p>
                        </div>
                    ) : (
                        <div className="grid gap-2.5">
                            {copyVariations.map((v, i) => (
                                <div 
                                    key={i} 
                                    className={`relative group bg-card border rounded-xl p-4 transition-all cursor-pointer overflow-hidden ${
                                        selectedCopyIndex === i 
                                        ? 'border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5' 
                                        : 'border-border hover:border-primary/40 hover:shadow-sm'
                                    }`}
                                    onClick={() => handleCopySelect(i, v.full_text)}
                                >
                                    {/* Selection indicator */}
                                    {selectedCopyIndex === i && (
                                        <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center animation-zoom-in shadow-sm">
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}

                                    {/* Style badge */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${
                                            selectedCopyIndex === i 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                            <Wand2 className="w-2.5 h-2.5" />
                                            {v.style}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <h5 className="font-bold text-sm text-foreground leading-snug mb-1.5 pr-8">{v.headline}</h5>
                                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{v.subline}</p>
                                    
                                    {/* CTA */}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                                            selectedCopyIndex === i 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'bg-muted/50 text-primary/70'
                                        }`}>
                                            {v.cta}
                                        </span>
                                        <span className={`text-[10px] font-medium transition-opacity ${
                                            selectedCopyIndex === i 
                                            ? 'text-primary opacity-100' 
                                            : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                                        }`}>
                                            {selectedCopyIndex === i ? '✓ Terpilih' : 'Klik untuk pilih'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Visual Prompt Editor */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xs shadow-sm">2</div>
                        <div>
                            <h3 className="font-semibold text-base">Sesuaikan Arahan Visual</h3>
                            <p className="text-xs text-muted-foreground">Aktif/nonaktifkan elemen, atau tulis revisi di bawah.</p>
                        </div>
                    </div>

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
    );
}

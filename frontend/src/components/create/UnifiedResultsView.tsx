import React from "react";
import { ParsedDesignData, VisualPromptPart } from "@/app/create/types";
import { VisualPromptEditor } from "./VisualPromptEditor";
import { Sparkles } from "lucide-react";

interface UnifiedResultsViewProps {
    parsedData: ParsedDesignData;
    onTogglePromptPart: (index: number) => void;
    onModifyPromptParts: (newParts: VisualPromptPart[], newCombined: string, newTranslation?: string) => void;
    onGenerate: () => void;
    isGeneratingImage: boolean;
}

export function UnifiedResultsView({
    parsedData,
    onTogglePromptPart,
    onModifyPromptParts,
    onGenerate,
    isGeneratingImage
}: UnifiedResultsViewProps) {

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
                    Sesuaikan arahan visual AI untuk memastikan setiap elemen produk tepat sasaran.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xs shadow-sm">1</div>
                    <div>
                        <h3 className="font-semibold text-base">Sesuaikan Arahan Visual</h3>
                        <p className="text-xs text-muted-foreground">Aktif/nonaktifkan elemen, atau tulis revisi di bawah.</p>
                    </div>
                </div>

                <div className="w-full">
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

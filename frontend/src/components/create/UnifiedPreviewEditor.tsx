import React, { useMemo } from "react";
import { ParsedDesignData, VariationResult } from "@/app/create/types";
import { CanvasContainer } from "@/components/create/parts/CanvasContainer";
import { EditorToolbar } from "@/components/create/parts/EditorToolbar";
import { AdjustmentSidebar } from "@/components/create/parts/AdjustmentSidebar";

export interface UnifiedPreviewEditorProps {
    parsedData: ParsedDesignData;
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    setActiveImageIndex: (idx: number) => void;
    variationResults: VariationResult[];
    selectedVariationIndex: number;
    setSelectedVariationIndex: (idx: number) => void;
    isSaving: boolean;
    onProceedToEditor: () => void;
    onTogglePromptPart: (index: number) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onModifyPromptParts: (newParts: any, newCombined: string, newTranslation?: string) => void;
    onGenerate: () => void;
    isGeneratingImage: boolean;
    onReset?: () => void;
}

/**
 * Top-level composer component coordinating the Canvas, Toolbar, and Sidebar sections.
 */
export function UnifiedPreviewEditor({
    parsedData,
    imageHistory,
    activeImageIndex,
    setActiveImageIndex,
    variationResults,
    selectedVariationIndex,
    setSelectedVariationIndex,
    isSaving,
    onProceedToEditor,
    onTogglePromptPart,
    onModifyPromptParts,
    onGenerate,
    isGeneratingImage,
    onReset
}: UnifiedPreviewEditorProps) {
    
    // Resolve the active image: prefer variation bundle, fallback to legacy
    const currentImageUrl = useMemo(() => {
        if (variationResults.length > 0 && variationResults[selectedVariationIndex]?.result_url) {
            return variationResults[selectedVariationIndex].result_url;
        }
        return imageHistory[activeImageIndex]?.url || parsedData.generated_image_url || null;
    }, [variationResults, selectedVariationIndex, imageHistory, activeImageIndex, parsedData.generated_image_url]);


    return (
        <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-background">
            {/* LEFT: Image Preview & Toolbar Controls (60%) */}
            <div className="flex-1 flex flex-col min-w-0 border-r md:h-full h-[60vh]">
                <div className="shrink-0 border-b border-border/40 bg-background px-4 py-4 md:px-6">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Hasil Siap Ditinjau</p>
                        <h2 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                            {variationResults.length > 1 
                                ? `Pilih variasi terbaik dari ${variationResults.length} hasil`
                                : "Pilih hasil terbaik lalu lanjutkan ke editor"}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Bandingkan variasi yang sudah dibuat, pilih yang paling dekat dengan target, lalu masuk ke editor untuk sentuhan akhir.
                        </p>
                        {variationResults.length > 1 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {variationResults.map((variation, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedVariationIndex(idx);
                                            // Sync activeImageIndex for backward compat
                                            const historyIdx = imageHistory.findIndex(h => h.url === variation.result_url);
                                            if (historyIdx >= 0) setActiveImageIndex(historyIdx);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            selectedVariationIndex === idx
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                                        }`}
                                    >
                                        Variasi {idx + 1}
                                        {variation.composition?.copy_space_side && (
                                            <span className="ml-1.5 opacity-70">
                                                · {variation.composition.copy_space_side.replace('_', ' ')}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <CanvasContainer imageUrl={currentImageUrl} />
                <EditorToolbar 
                    imageHistory={imageHistory}
                    activeImageIndex={activeImageIndex}
                    setActiveImageIndex={setActiveImageIndex}
                    isSaving={isSaving}
                    isGeneratingImage={isGeneratingImage}
                    onReset={onReset}
                    onProceedToEditor={onProceedToEditor}
                />
            </div>

            {/* RIGHT: Editor & Tweak Panel (40%) */}
            <AdjustmentSidebar 
                parsedData={parsedData}
                onTogglePromptPart={onTogglePromptPart}
                onModifyPromptParts={onModifyPromptParts}
                onGenerate={onGenerate}
                isGeneratingImage={isGeneratingImage}
            />
        </div>
    );
}

import React, { useMemo } from "react";
import { ParsedDesignData } from "@/app/create/types";
import { CanvasContainer } from "@/components/create/parts/CanvasContainer";
import { EditorToolbar } from "@/components/create/parts/EditorToolbar";
import { AdjustmentSidebar } from "@/components/create/parts/AdjustmentSidebar";

export interface UnifiedPreviewEditorProps {
    parsedData: ParsedDesignData;
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    setActiveImageIndex: (idx: number) => void;
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
    isSaving,
    onProceedToEditor,
    onTogglePromptPart,
    onModifyPromptParts,
    onGenerate,
    isGeneratingImage,
    onReset
}: UnifiedPreviewEditorProps) {
    
    // Resolve the active image to render (latest generated or currently selected in history)
    const currentImageUrl = useMemo(() => {
        return imageHistory[activeImageIndex]?.url || parsedData.generated_image_url || null;
    }, [imageHistory, activeImageIndex, parsedData.generated_image_url]);

    return (
        <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-background">
            {/* LEFT: Image Preview & Toolbar Controls (60%) */}
            <div className="flex-1 flex flex-col min-w-0 border-r md:h-full h-[60vh]">
                <div className="shrink-0 border-b border-border/40 bg-background px-4 py-4 md:px-6">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Hasil Pertama Siap Ditinjau</p>
                        <h2 className="mt-1 text-xl font-bold text-foreground md:text-2xl">Pilih hasil terbaik lalu lanjutkan ke editor</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Bandingkan variasi yang sudah dibuat, pilih yang paling dekat dengan target, lalu masuk ke editor untuk sentuhan akhir.
                        </p>
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

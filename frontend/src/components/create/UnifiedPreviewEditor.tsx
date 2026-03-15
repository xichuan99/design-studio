import React from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParsedDesignData } from "@/app/create/types";
import { DesignPreview } from "@/components/create/DesignPreview";
import { VisualPromptEditor } from "@/components/create/VisualPromptEditor";
import { GenerationHistoryList } from "./inputs/GenerationHistoryList";

interface UnifiedPreviewEditorProps {
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
}

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
    isGeneratingImage
}: UnifiedPreviewEditorProps) {
    return (
        <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-background">
            {/* LEFT: Image Preview (60%) */}
            <div className="flex-1 flex flex-col min-w-0 border-r md:h-full h-[60vh]">
                <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden bg-muted/20 relative">
                    <DesignPreview
                        imageUrl={imageHistory[activeImageIndex]?.url || parsedData.generated_image_url || null}
                    />
                </div>

                {/* Left Bottom Controls (Thumbnail Strip & Proceed CTA) */}
                <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm px-4 py-3 flex gap-4 items-center justify-between">
                    <GenerationHistoryList 
                        imageHistory={imageHistory}
                        activeImageIndex={activeImageIndex}
                        setActiveImageIndex={setActiveImageIndex}
                    />
                    
                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                        <Button
                            size="sm"
                            className="font-bold shadow-lg h-10 px-6 shrink-0"
                            onClick={onProceedToEditor}
                            disabled={isSaving || isGeneratingImage}
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Masuk Editor...</>
                            ) : (
                                <>Lanjut ke Editor <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* RIGHT: Editor & Tweak Panel (40%) */}
            <div className="w-full md:w-[400px] shrink-0 flex flex-col bg-card/50 overflow-y-auto">
                <div className="p-5 flex-1">
                    <h3 className="font-semibold text-lg mb-4 text-foreground">Sempurnakan Prompt AI</h3>
                    <VisualPromptEditor
                        parsedData={parsedData}
                        onTogglePromptPart={onTogglePromptPart}
                        onModifyPromptParts={onModifyPromptParts}
                        compact={true}
                        onGenerate={onGenerate}
                        isGeneratingImage={isGeneratingImage}
                    />
                </div>
            </div>
        </div>
    );
}

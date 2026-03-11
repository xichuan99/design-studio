import React from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParsedDesignData } from "@/app/create/types";
import { DesignPreview } from "@/components/create/DesignPreview";
import { VisualPromptEditor } from "@/components/create/VisualPromptEditor";

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
}

export function UnifiedPreviewEditor({
    parsedData,
    imageHistory,
    activeImageIndex,
    setActiveImageIndex,
    isSaving,
    onProceedToEditor,
    onTogglePromptPart,
    onModifyPromptParts
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
                    <div className="flex-1 flex items-center overflow-x-auto gap-2 pb-1 scrollbar-thin scrollbar-thumb-border">
                        {imageHistory.length > 1 && imageHistory.map((historyItem, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImageIndex(idx)}
                                className={`relative shrink-0 w-12 h-12 rounded-md overflow-hidden transition-all ${
                                    activeImageIndex === idx 
                                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105 opacity-100' 
                                        : 'opacity-60 hover:opacity-100 hover:scale-105 border border-border/50'
                                }`}
                                title={historyItem.prompt}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={historyItem.url} 
                                    alt={`Variation ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                {activeImageIndex === idx && (
                                    <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
                                        <Check className="w-2.5 h-2.5" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    
                    <Button
                        size="sm"
                        className="font-bold shadow-lg h-10 px-6 shrink-0"
                        onClick={onProceedToEditor}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Masuk Editor...</>
                        ) : (
                            <>Lanjut ke Editor <ArrowRight className="w-4 h-4 ml-2" /></>
                        )}
                    </Button>
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
                    />
                </div>
            </div>
        </div>
    );
}

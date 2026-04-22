import React from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerationHistoryList } from "@/components/create/inputs/GenerationHistoryList";

interface EditorToolbarProps {
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    setActiveImageIndex: (idx: number) => void;
    isSaving: boolean;
    isGeneratingImage: boolean;
    onReset?: () => void;
    onProceedToEditor: () => void;
}

/**
 * Renders the bottom action bar containing generation timeline, reset, and proceed triggers.
 */
export function EditorToolbar({
    imageHistory,
    activeImageIndex,
    setActiveImageIndex,
    isSaving,
    isGeneratingImage,
    onReset,
    onProceedToEditor,
}: EditorToolbarProps) {
    const variationCount = imageHistory.length;

    return (
        <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm px-4 py-3 flex gap-4 items-center justify-between">
            <div className="min-w-0 flex items-center gap-4">
                {variationCount > 1 && (
                    <div className="hidden md:block shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Variasi Hasil</p>
                        <p className="mt-1 text-xs text-muted-foreground">Pilih hasil {activeImageIndex + 1} dari {variationCount}</p>
                    </div>
                )}

                <GenerationHistoryList 
                    imageHistory={imageHistory}
                    activeImageIndex={activeImageIndex}
                    setActiveImageIndex={setActiveImageIndex}
                />
                
                {/* Mulai Baru Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors hidden sm:flex"
                    onClick={onReset}
                >
                    <span className="mr-2">🔄</span> Mulai Baru
                </Button>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 ml-auto">
                {/* Mobile Icon-only Mulai Baru */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors sm:hidden h-11 w-11"
                    onClick={onReset}
                    title="Mulai Baru"
                >
                    🔄
                </Button>
                <Button
                    size="sm"
                    className="font-bold shadow-lg h-10 px-4 sm:px-6 shrink-0"
                    onClick={onProceedToEditor}
                    disabled={isSaving || isGeneratingImage}
                >
                    {isSaving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuka Editor...</>
                    ) : (
                        <><span className="hidden sm:inline">Lanjut Rapikan di Editor</span><span className="sm:hidden">Ke Editor</span> <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                </Button>
            </div>
        </div>
    );
}

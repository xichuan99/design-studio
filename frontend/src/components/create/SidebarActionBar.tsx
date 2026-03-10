import React from "react";
import { Loader2, Sparkles, ArrowLeft, LayoutTemplate, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarActionBarProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedTemplate: any;
    currentStep: 'input' | 'prompt-review' | 'generating' | 'preview';
    isParsing: boolean;
    isGeneratingImage: boolean;
    rawText: string;
    isInputLocked: boolean;
    onClearTemplate: () => void;
    onAnalyze: () => void;
    onGenerate: () => void;
    onBackToInput: () => void;
}

export function SidebarActionBar({
    selectedTemplate,
    currentStep,
    isParsing,
    isGeneratingImage,
    rawText,
    isInputLocked,
    onClearTemplate,
    onAnalyze,
    onGenerate,
    onBackToInput
}: SidebarActionBarProps) {
    return (
        <div className="p-4 border-t bg-card sticky bottom-0 tour-step-3">
            {selectedTemplate && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                            {selectedTemplate.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={selectedTemplate.thumbnail_url} alt={selectedTemplate.name} className="w-full h-full object-cover" />
                            ) : (
                                <LayoutTemplate className="w-5 h-5 text-muted-foreground opacity-50" />
                            )}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Preset Aktif</span>
                            <span className="text-sm font-medium truncate">{selectedTemplate.name}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClearTemplate}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0"
                        title="Hapus preset"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            )}
            <Button
                className="w-full font-bold shadow-lg gap-2"
                size="lg"
                onClick={
                    currentStep === 'input' ? onAnalyze :
                    currentStep === 'prompt-review' ? onGenerate :
                    currentStep === 'preview' ? onGenerate :
                    onBackToInput
                }
                disabled={isParsing || isGeneratingImage || (!rawText.trim() && currentStep === 'input')}
                variant={isInputLocked && !isGeneratingImage ? "outline" : "default"}
            >
                {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> :
                    isGeneratingImage ? <><Loader2 className="w-4 h-4 animate-spin" /> Sedang Menggambar...</> :
                        currentStep === 'input' ? <><Sparkles className="w-4 h-4" /> Analisis Teks AI</> :
                            (currentStep === 'prompt-review' || currentStep === 'preview') ? <><Sparkles className="w-4 h-4" /> Generate Gambar AI</> :
                                <><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Input teks asli</>}
            </Button>
        </div>
    );
}

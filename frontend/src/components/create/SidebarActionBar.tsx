import React from "react";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarActionBarProps {
    currentStep: 'input' | 'brief' | 'prompt-review' | 'generating' | 'preview';
    isParsing: boolean;
    isGeneratingImage: boolean;
    rawText: string;
    isInputLocked: boolean;
    onAnalyze: () => void;
    onGenerate: () => void;
    onBackToInput: () => void;
}

export function SidebarActionBar({
    currentStep,
    isParsing,
    isGeneratingImage,
    rawText,
    isInputLocked,
    onAnalyze,
    onGenerate,
    onBackToInput
}: SidebarActionBarProps) {
    return (
        <div className="p-4 border-t bg-card sticky bottom-0 tour-step-3">
            <Button
                className="w-full font-bold shadow-lg gap-2"
                size="lg"
                onClick={
                    currentStep === 'input' ? onAnalyze :
                    currentStep === 'brief' ? onBackToInput :
                    currentStep === 'prompt-review' ? onGenerate :
                    currentStep === 'preview' ? onGenerate :
                    onBackToInput
                }
                disabled={isParsing || isGeneratingImage || (!rawText.trim() && currentStep === 'input')}
                variant={(isInputLocked && currentStep !== 'brief' && !isGeneratingImage) ? "outline" : currentStep === 'brief' ? "ghost" : "default"}
            >
                {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> :
                    isGeneratingImage ? <><Loader2 className="w-4 h-4 animate-spin" /> Sedang Menggambar...</> :
                        currentStep === 'input' ? <><Sparkles className="w-4 h-4" /> Bantu Saya Perjelas</> :
                            currentStep === 'brief' ? <><ArrowLeft className="w-4 h-4" /> Kembali ke Deskripsi</> :
                                (currentStep === 'prompt-review' || currentStep === 'preview') ? <><Sparkles className="w-4 h-4" /> Generate Gambar AI</> :
                                    <><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Input teks asli</>}
            </Button>
        </div>
    );
}

import React from "react";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarActionBarProps {
    currentStep: 'input' | 'brief' | 'prompt-review' | 'generating' | 'preview';
    isParsing: boolean;
    rawText: string;
    isInputLocked: boolean;
    onAnalyze: () => void;
    onBackToInput: () => void;
}

export function SidebarActionBar({
    currentStep,
    isParsing,
    rawText,
    isInputLocked,
    onAnalyze,
    onBackToInput
}: SidebarActionBarProps) {
    if (currentStep === 'generating') return null;

    return (
        <div className="p-4 border-t bg-card sticky bottom-0 tour-step-3">
            <Button
                className="w-full font-bold shadow-lg gap-2"
                size="lg"
                onClick={
                    currentStep === 'input' ? onAnalyze :
                    onBackToInput
                }
                disabled={isParsing || (!rawText.trim() && currentStep === 'input')}
                variant={(isInputLocked && currentStep !== 'brief') ? "outline" : currentStep === 'brief' ? "ghost" : "default"}
            >
                {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> :
                        currentStep === 'input' ? <><Sparkles className="w-4 h-4" /> Bantu Saya Perjelas</> :
                            currentStep === 'brief' ? <><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Deskripsi</> :
                                    <><ArrowLeft className="w-4 h-4 mr-2" /> Kembali Edit Teks</>}
            </Button>
        </div>
    );
}

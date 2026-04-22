import React from "react";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarActionBarProps {
    currentStep: 'input' | 'brief' | 'results' | 'generating' | 'preview';
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
    onBackToInput,
    createMode,
    referenceFile,
    onGenerateDirectly
}: SidebarActionBarProps & { 
    createMode?: 'generate' | 'redesign'; 
    referenceFile?: File | null;
    onGenerateDirectly?: () => void;
}) {
    if (currentStep === 'generating') return null;

    const isRedesign = createMode === 'redesign';
    const isReadyToRedesign = isRedesign && referenceFile !== null;
    const inputLabel = isRedesign ? "Mulai Redesign" : "Lanjutkan ke Arahan Visual";
    const inputLoadingLabel = isRedesign ? "Menyiapkan redesign..." : "Menyusun arahan visual...";
    const backLabel = currentStep === 'brief' ? "Kembali ke Brief" : "Kembali Ubah Brief";

    return (
        <div className="p-4 border-t bg-card sticky bottom-0 tour-step-3">
            <Button
                className="w-full font-bold shadow-lg gap-2"
                size="lg"
                onClick={
                    currentStep === 'input' 
                        ? (isRedesign && onGenerateDirectly ? onGenerateDirectly : onAnalyze) 
                        : onBackToInput
                }
                disabled={isParsing || (!isRedesign && !rawText.trim() && currentStep === 'input') || (isRedesign && !isReadyToRedesign && currentStep === 'input')}
                variant={(isInputLocked && currentStep !== 'brief') ? "outline" : currentStep === 'brief' ? "ghost" : "default"}
            >
                {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> {inputLoadingLabel}</> :
                        currentStep === 'input' ? 
                            <><Sparkles className="w-4 h-4" /> {inputLabel}</> :
                            <><ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}</>}
            </Button>
        </div>
    );
}

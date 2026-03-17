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
                {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> :
                        currentStep === 'input' ? 
                            (isRedesign ? <><Sparkles className="w-4 h-4" /> Mulai Redesign</> : <><Sparkles className="w-4 h-4" /> Bantu Saya Perjelas</>) :
                            currentStep === 'brief' ? <><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Deskripsi</> :
                                    <><ArrowLeft className="w-4 h-4 mr-2" /> Kembali Edit Teks</>}
            </Button>
        </div>
    );
}

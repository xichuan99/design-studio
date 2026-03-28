import React from "react";
import { ParsedDesignData } from "@/app/create/types";
import { VisualPromptEditor } from "@/components/create/VisualPromptEditor";

interface AdjustmentSidebarProps {
    parsedData: ParsedDesignData;
    onTogglePromptPart: (index: number) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onModifyPromptParts: (newParts: any, newCombined: string, newTranslation?: string) => void;
    onGenerate: () => void;
    isGeneratingImage: boolean;
}

/**
 * Renders the right-side control panel containing the layout parameter tweaks via VisualPromptEditor.
 */
export function AdjustmentSidebar({
    parsedData,
    onTogglePromptPart,
    onModifyPromptParts,
    onGenerate,
    isGeneratingImage,
}: AdjustmentSidebarProps) {
    return (
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
    );
}

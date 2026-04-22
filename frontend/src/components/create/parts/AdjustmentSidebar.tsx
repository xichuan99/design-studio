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
                <div className="mb-4">
                    <h3 className="font-semibold text-lg text-foreground">Sesuaikan Hasil Berikutnya</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Gunakan panel ini untuk memperbaiki arahan visual lalu generate ulang jika hasilnya belum pas.
                    </p>
                </div>
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

"use client";

import React, { useState } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useProjectApi } from "@/lib/api";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { CreditCostBadge } from "@/components/credits/CreditCostBadge";
import { CreditConfirmDialog } from "@/components/credits/CreditConfirmDialog";

export function ImageStyleEditor() {
    const { elements, selectedElementIds, updateElement } = useCanvasStore();
    const api = useProjectApi();
    const [isUpscaling, setIsUpscaling] = useState(false);

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement || selectedElement.type !== 'image') return null;

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    const handleUpscale = async () => {
        if (!selectedElement.url) return;
        
        try {
            setIsUpscaling(true);
            const response = await fetch(selectedElement.url);
            const blob = await response.blob();
            const file = new File([blob], 'upscale-source.png', { type: blob.type || 'image/png' });
            
            const result = await api.upscaleImage(file);
            if (result && result.url) {
                updateElement(selectedElement.id, { url: result.url });
            }
        } catch (error) {
            console.error('Failed to upscale image:', error);
        } finally {
            setIsUpscaling(false);
        }
    };

    return (
        <AccordionItem value="image-appearance" className="border-none bg-muted/30 rounded-lg px-3">
            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Tampilan</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">Width</label>
                        <Input
                            type="number"
                            className="h-8 text-xs bg-background"
                            value={Math.round(selectedElement.width || 0)}
                            onChange={(e) => updateAttr('width', Math.max(10, parseInt(e.target.value) || 10))}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">Height</label>
                        <Input
                            type="number"
                            className="h-8 text-xs bg-background"
                            value={Math.round(selectedElement.height || 0)}
                            onChange={(e) => updateAttr('height', Math.max(10, parseInt(e.target.value) || 10))}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                    <label className="text-[10px] font-medium flex justify-between">
                        <span>Radius Sudut</span>
                        <span className="text-muted-foreground">{selectedElement.cornerRadius || 0}px</span>
                    </label>
                    <input
                        type="range"
                        min="0" max="100"
                        value={selectedElement.cornerRadius || 0}
                        onChange={(e) => updateAttr('cornerRadius', parseInt(e.target.value) || 0)}
                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* AI Upscale Button */}
                <div className="pt-4 mt-2">
                    <CreditConfirmDialog
                        title="AI Tingkatkan Resolusi"
                        description="AI akan meningkatkan resolusi gambar ini agar lebih jernih dan tajam. Ini akan memotong 20 kredit."
                        cost={20}
                        onConfirm={handleUpscale}
                        disabled={isUpscaling}
                    >
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full gap-2 text-primary hover:text-primary hover:bg-primary/10 border-primary/20 flex items-center justify-between"
                            disabled={isUpscaling}
                        >
                            <span className="flex items-center gap-2">
                                {isUpscaling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                {isUpscaling ? 'Meningkatkan...' : 'AI Tingkatkan Resolusi'}
                            </span>
                            {!isUpscaling && <CreditCostBadge cost={20} showTooltip={false} className="h-5 text-[10px]" />}
                        </Button>
                    </CreditConfirmDialog>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { FillColorControl } from "./FillColorControl";

export function ShapeStyleEditor() {
    const { elements, selectedElementIds, updateElement } = useCanvasStore();

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement || selectedElement.type !== 'shape') return null;

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    return (
        <AccordionItem value="shape-basic" className="border-none bg-muted/30 rounded-lg px-3">
            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Tampilan</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 col-span-2">
                        <FillColorControl label="Fill Color" defaultColor="#e2e8f0" />
                    </div>

                    {(selectedElement.shapeType === 'rect' || !selectedElement.shapeType) && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium">Radius</label>
                            <Input
                                type="number"
                                className="h-8 text-xs bg-background"
                                min={0} max={100}
                                value={selectedElement.cornerRadius || 0}
                                onChange={(e) => updateAttr('cornerRadius', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandSwatches } from "./BrandSwatches";

export function EffectsPanel() {
    const { elements, selectedElementIds, updateElement } = useCanvasStore();

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement || (selectedElement.type !== 'text' && selectedElement.type !== 'shape' && selectedElement.type !== 'image')) return null;

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    return (
        <AccordionItem value="effects" className="border-none bg-muted/30 rounded-lg px-3">
            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Efek</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-5 pb-3">

                {/* Stroke / Outline */}
                <div className="flex flex-col gap-3">
                    <label className="text-xs font-medium">{selectedElement.type === 'text' ? 'Outline' : 'Border'}</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                                <input
                                    type="color"
                                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                    value={selectedElement.stroke || '#000000'}
                                    onChange={(e) => updateAttr('stroke', e.target.value)}
                                />
                                <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                    {(selectedElement.stroke || '#000000')}
                                </span>
                            </div>
                            <BrandSwatches onSelectColor={(c) => updateAttr('stroke', c)} />
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] justify-start px-0 text-muted-foreground mt-1" onClick={() => updateAttr('stroke', undefined)} disabled={!selectedElement.stroke}>
                                Hapus
                            </Button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Input
                                type="number"
                                className="h-8 text-xs bg-background"
                                min={0} max={20}
                                value={selectedElement.strokeWidth || 0}
                                onChange={(e) => updateAttr('strokeWidth', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-border/50" />

                {/* Drop Shadow */}
                <div className="flex flex-col gap-3">
                    <label className="text-xs font-medium">Bayangan</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                                <input
                                    type="color"
                                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                    value={selectedElement.shadowColor || '#000000'}
                                    onChange={(e) => updateAttr('shadowColor', e.target.value)}
                                />
                                <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                    {(selectedElement.shadowColor || '#000000')}
                                </span>
                            </div>
                            <BrandSwatches onSelectColor={(c) => updateAttr('shadowColor', c)} />
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] justify-start px-0 text-muted-foreground mt-1" onClick={() => {
                                updateAttr('shadowColor', undefined);
                                updateAttr('shadowBlur', undefined);
                                updateAttr('shadowOffsetX', undefined);
                                updateAttr('shadowOffsetY', undefined);
                            }} disabled={!selectedElement.shadowColor}>
                                Hapus Bayangan
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-medium flex justify-between">
                                <span className="text-muted-foreground">Radius Blur</span>
                                <span>{selectedElement.shadowBlur || 0}</span>
                            </label>
                            <input type="range" min="0" max="50" step="1" value={selectedElement.shadowBlur || 0} onChange={(e) => updateAttr('shadowBlur', parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-medium flex justify-between">
                                <span className="text-muted-foreground">Offset X</span>
                                <span>{selectedElement.shadowOffsetX || 0}</span>
                            </label>
                            <input type="range" min="-20" max="20" step="1" value={selectedElement.shadowOffsetX || 0} onChange={(e) => updateAttr('shadowOffsetX', parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-medium flex justify-between">
                                <span className="text-muted-foreground">Offset Y</span>
                                <span>{selectedElement.shadowOffsetY || 0}</span>
                            </label>
                            <input type="range" min="-20" max="20" step="1" value={selectedElement.shadowOffsetY || 0} onChange={(e) => updateAttr('shadowOffsetY', parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

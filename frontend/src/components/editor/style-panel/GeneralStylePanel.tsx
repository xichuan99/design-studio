"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function GeneralStylePanel() {
    const { elements, selectedElementIds, updateElement, bringForward, sendBackward, bringToFront, sendToBack } = useCanvasStore();

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement) return null;

    const elIndex = elements.findIndex(el => el.id === selectedElement.id);
    const isTop = elIndex === elements.length - 1;
    const isBottom = elIndex === 0;

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    return (
        <AccordionItem value="general" className="border-none bg-muted/30 rounded-lg px-3">
            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Umum</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-3">
                {/* Position & Size Inputs */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Posisi &amp; Ukuran</label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">X</span>
                            <Input
                                type="number"
                                value={Math.round(selectedElement.x)}
                                onChange={(e) => updateAttr('x', parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs font-mono px-2"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Y</span>
                            <Input
                                type="number"
                                value={Math.round(selectedElement.y)}
                                onChange={(e) => updateAttr('y', parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs font-mono px-2"
                            />
                        </div>
                        {selectedElement.width !== undefined && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">W</span>
                                <Input
                                    type="number"
                                    min="1"
                                    value={Math.round(selectedElement.width)}
                                    onChange={(e) => updateAttr('width', Math.max(1, parseFloat(e.target.value) || 1))}
                                    className="h-7 text-xs font-mono px-2"
                                />
                            </div>
                        )}
                        {selectedElement.height !== undefined && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">H</span>
                                <Input
                                    type="number"
                                    min="1"
                                    value={Math.round(selectedElement.height)}
                                    onChange={(e) => updateAttr('height', Math.max(1, parseFloat(e.target.value) || 1))}
                                    className="h-7 text-xs font-mono px-2"
                                />
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Rotasi °</span>
                            <Input
                                type="number"
                                min="-360" max="360"
                                value={Math.round(selectedElement.rotation)}
                                onChange={(e) => updateAttr('rotation', parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs font-mono px-2"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium flex justify-between">
                        <span>Transparansi</span>
                        <span className="text-muted-foreground">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                    </label>
                    <input
                        type="range"
                        min="5" max="100"
                        value={Math.round((selectedElement.opacity ?? 1) * 100)}
                        onChange={(e) => updateAttr('opacity', parseInt(e.target.value) / 100)}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium flex justify-between">
                        <span>Urutan Layer</span>
                        <span className="font-mono text-xs text-muted-foreground">{elIndex + 1} / {elements.length}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => bringToFront(selectedElement.id)} disabled={isTop}>↑↑ Depan</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => sendToBack(selectedElement.id)} disabled={isBottom}>↓↓ Belakang</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => bringForward(selectedElement.id)} disabled={isTop}>↑ Maju</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => sendBackward(selectedElement.id)} disabled={isBottom}>↓ Mundur</Button>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

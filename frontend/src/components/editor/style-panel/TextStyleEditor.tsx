"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { FillColorControl } from "./FillColorControl";

export function TextStyleEditor() {
    const { elements, selectedElementIds, updateElement } = useCanvasStore();

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement || selectedElement.type !== 'text') return null;

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    return (
        <>
            <AccordionItem value="typography" className="border-none bg-muted/30 rounded-lg px-3">
                <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Tipografi</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 pb-3">
                    <div className="flex flex-col gap-2">
                        <textarea
                            className="w-full text-sm p-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                            value={selectedElement.text || ''}
                            onChange={(e) => updateAttr('text', e.target.value)}
                            placeholder="Enter text..."
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium">Font Family</label>
                        <Select
                            value={selectedElement.fontFamily || 'Inter'}
                            onValueChange={(val) => updateAttr('fontFamily', val)}
                        >
                            <SelectTrigger className="w-full text-xs h-8 bg-background">
                                <SelectValue placeholder="Font Family" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Inter" style={{ fontFamily: 'Inter' }}>Inter</SelectItem>
                                <SelectItem value="Poppins" style={{ fontFamily: 'Poppins' }}>Poppins</SelectItem>
                                <SelectItem value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</SelectItem>
                                <SelectItem value="Playfair Display" style={{ fontFamily: '"Playfair Display", serif' }}>Playfair Display</SelectItem>
                                <SelectItem value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</SelectItem>
                                <SelectItem value="Oswald" style={{ fontFamily: 'Oswald' }}>Oswald</SelectItem>
                                <SelectItem value="Lato" style={{ fontFamily: 'Lato' }}>Lato</SelectItem>
                                <SelectItem value="Raleway" style={{ fontFamily: 'Raleway' }}>Raleway</SelectItem>
                                <SelectItem value="Plus Jakarta Sans" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Plus Jakarta Sans</SelectItem>
                                <SelectItem value="DM Sans" style={{ fontFamily: '"DM Sans", sans-serif' }}>DM Sans</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium">Size</label>
                            <Input
                                type="number"
                                className="h-8 text-xs bg-background"
                                value={Math.round(selectedElement.fontSize || 24)}
                                onChange={(e) => updateAttr('fontSize', parseInt(e.target.value) || 24)}
                            />
                        </div>
                        <FillColorControl label="Color" defaultColor="#000000" />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="formatting" className="border-none bg-muted/30 rounded-lg px-3">
                <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Format</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 pb-3">
                    <div className="flex justify-between items-center bg-background p-1 rounded-md border text-muted-foreground">
                        <Button variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}>
                            <Bold className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}>
                            <Italic className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant={selectedElement.align === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('align', 'left')}>
                            <AlignLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant={(!selectedElement.align || selectedElement.align === 'center') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('align', 'center')}>
                            <AlignCenter className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant={selectedElement.align === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('align', 'right')}>
                            <AlignRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-medium flex justify-between">
                                <span>Jarak Huruf</span>
                                <span className="text-muted-foreground">{selectedElement.letterSpacing || 0}px</span>
                            </label>
                            <input
                                type="range"
                                min="-5" max="20" step="0.5"
                                value={selectedElement.letterSpacing || 0}
                                onChange={(e) => updateAttr('letterSpacing', parseFloat(e.target.value))}
                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-medium flex justify-between">
                                <span>Tinggi Baris</span>
                                <span className="text-muted-foreground">{selectedElement.lineHeight || 1.2}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5" max="3" step="0.1"
                                value={selectedElement.lineHeight || 1.2}
                                onChange={(e) => updateAttr('lineHeight', parseFloat(e.target.value))}
                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </>
    );
}

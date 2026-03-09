"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { SlidersHorizontal, Type, Layout, Image as ImageIcon, CornerDownRight, AlignJustify, MoveUp, MoveDown, Maximize, MousePointer2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

export const StylePanel: React.FC = () => {
    const { elements, selectedElementId, updateElement, deleteElement, duplicateElement, bringForward, sendBackward, bringToFront, sendToBack } = useCanvasStore();

    const selectedElement = elements.find((el) => el.id === selectedElementId);

    if (!selectedElement) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-card">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MousePointer2 className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium">No element selected</p>
                <p className="text-xs opacity-70 mt-1">Click on an element in the canvas to edit its properties.</p>
            </div>
        );
    }

    const updateAttr = (key: string, value: string | number | boolean | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    const elIndex = elements.findIndex(el => el.id === selectedElement.id);
    const isTop = elIndex === elements.length - 1;
    const isBottom = elIndex === 0;

    return (
        <div className="w-64 border-l bg-card flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b font-medium flex justify-between items-center">
                <span className="capitalize">{selectedElement.type} Styles</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteElement(selectedElement.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Accordion type="multiple" defaultValue={['general', 'typography', 'formatting', 'effects', 'shape-basic', 'shape-border']} className="w-full space-y-4">

                    {/* General Section */}
                    <AccordionItem value="general" className="border-none bg-muted/30 rounded-lg px-3">
                        <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">General</AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4 pb-3">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium flex justify-between">
                                    <span>Opacity</span>
                                    <span className="text-muted-foreground">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={Math.round((selectedElement.opacity ?? 1) * 100)}
                                    onChange={(e) => updateAttr('opacity', parseInt(e.target.value) / 100)}
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium flex justify-between">
                                    <span>Layer Order</span>
                                    <span className="font-mono text-xs text-muted-foreground">{elIndex + 1} / {elements.length}</span>
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => bringToFront(selectedElement.id)} disabled={isTop}>↑↑ Front</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => sendToBack(selectedElement.id)} disabled={isBottom}>↓↓ Back</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => bringForward(selectedElement.id)} disabled={isTop}>↑ Forward</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => sendBackward(selectedElement.id)} disabled={isBottom}>↓ Backward</Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Text Specific Sections */}
                    {selectedElement.type === 'text' && (
                        <>
                            <AccordionItem value="typography" className="border-none bg-muted/30 rounded-lg px-3">
                                <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Typography</AccordionTrigger>
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
                                                <SelectItem value="Inter">Inter</SelectItem>
                                                <SelectItem value="Poppins">Poppins</SelectItem>
                                                <SelectItem value="Roboto">Roboto</SelectItem>
                                                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                                                <SelectItem value="Montserrat">Montserrat</SelectItem>
                                                <SelectItem value="Oswald">Oswald</SelectItem>
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
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium">Color</label>
                                            <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                                                <input
                                                    type="color"
                                                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                                    value={selectedElement.fill || '#000000'}
                                                    onChange={(e) => updateAttr('fill', e.target.value)}
                                                />
                                                <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                                    {(selectedElement.fill || '#000000')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="formatting" className="border-none bg-muted/30 rounded-lg px-3">
                                <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Formatting</AccordionTrigger>
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
                                                <span>Letter Spacing</span>
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
                                                <span>Line Height</span>
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
                    )}

                    {/* Shapes Specific Sections */}
                    {selectedElement.type === 'shape' && (
                        <AccordionItem value="shape-basic" className="border-none bg-muted/30 rounded-lg px-3">
                            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Appearance</AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-4 pb-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium">Fill Color</label>
                                        <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                                            <input
                                                type="color"
                                                className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                                value={selectedElement.fill || '#e2e8f0'}
                                                onChange={(e) => updateAttr('fill', e.target.value)}
                                            />
                                            <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                                {(selectedElement.fill || '#e2e8f0')}
                                            </span>
                                        </div>
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
                    )}

                    {/* Shared Effects Section (Text & Shapes) */}
                    {(selectedElement.type === 'text' || selectedElement.type === 'shape') && (
                        <AccordionItem value="effects" className="border-none bg-muted/30 rounded-lg px-3">
                            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Effects</AccordionTrigger>
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
                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] justify-start px-0 text-muted-foreground" onClick={() => updateAttr('stroke', undefined)} disabled={!selectedElement.stroke}>
                                                Remove
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
                                    <label className="text-xs font-medium">Drop Shadow</label>
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
                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] justify-start px-0 text-muted-foreground" onClick={() => {
                                                updateAttr('shadowColor', undefined);
                                                updateAttr('shadowBlur', undefined);
                                                updateAttr('shadowOffsetX', undefined);
                                                updateAttr('shadowOffsetY', undefined);
                                            }} disabled={!selectedElement.shadowColor}>
                                                Clear Shadow
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-medium flex justify-between">
                                                <span className="text-muted-foreground">Blur Radius</span>
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
                    )}

                </Accordion>
            </div>
        </div>
    );
};

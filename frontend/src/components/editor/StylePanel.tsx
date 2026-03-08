"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const StylePanel: React.FC = () => {
    const { elements, selectedElementId, updateElement, deleteElement, duplicateElement, bringForward, sendBackward, bringToFront, sendToBack } = useCanvasStore();

    const selectedElement = elements.find((el) => el.id === selectedElementId);

    if (!selectedElement) {
        return (
            <div className="w-64 border-l bg-card p-4 flex flex-col items-center justify-center text-muted-foreground text-sm">
                Select an element to style it
            </div>
        );
    }

    const updateAttr = (key: string, value: string | number | boolean) => {
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

            <div className="p-4 flex flex-col gap-6">
                {/* Global Element Controls: Opacity & Layer */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                        <span>Opacity</span>
                        <span>{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0" max="100"
                        value={Math.round((selectedElement.opacity ?? 1) * 100)}
                        onChange={(e) => updateAttr('opacity', parseInt(e.target.value) / 100)}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-col gap-2 border-b pb-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                        <span>Layer Order</span>
                        <span className="font-mono text-muted-foreground">{elIndex + 1} / {elements.length}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => bringToFront(selectedElement.id)} disabled={isTop} title="Bring to Front">
                            ↑↑ To Front
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => sendToBack(selectedElement.id)} disabled={isBottom} title="Send to Back">
                            ↓↓ To Back
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => bringForward(selectedElement.id)} disabled={isTop} title="Bring Forward">
                            ↑ Forward
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => sendBackward(selectedElement.id)} disabled={isBottom} title="Send Backward">
                            ↓ Backward
                        </Button>
                    </div>
                </div>

                {/* Text Specific Controls */}
                {selectedElement.type === 'text' && (
                    <>
                        {/* Editor for raw text content */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Text Content</label>
                            <textarea
                                className="w-full text-sm p-2 border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                                rows={3}
                                value={selectedElement.text || ''}
                                onChange={(e) => updateAttr('text', e.target.value)}
                            />
                        </div>

                        {/* Font Family */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Font Family</label>
                            <Select
                                value={selectedElement.fontFamily || 'Inter'}
                                onValueChange={(val) => updateAttr('fontFamily', val)}
                            >
                                <SelectTrigger className="w-full text-sm h-9">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Size</label>
                                <Input
                                    type="number"
                                    className="h-9"
                                    value={Math.round(selectedElement.fontSize || 24)}
                                    onChange={(e) => updateAttr('fontSize', parseInt(e.target.value) || 24)}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Color</label>
                                <div className="flex items-center gap-2 h-9 border rounded-md px-2 overflow-hidden">
                                    <input
                                        type="color"
                                        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                                        value={selectedElement.fill || '#000000'}
                                        onChange={(e) => updateAttr('fill', e.target.value)}
                                    />
                                    <span className="text-xs text-muted-foreground font-mono tracking-tighter truncate">
                                        {(selectedElement.fill || '#000000').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Formatting Actions */}
                        <div className="flex gap-1 justify-between bg-muted p-1 rounded-md border">
                            <Button
                                variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateAttr('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                            >
                                <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateAttr('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}
                            >
                                <Italic className="h-4 w-4" />
                            </Button>
                            <div className="w-px h-8 bg-border" />
                            <Button
                                variant={selectedElement.align === 'left' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateAttr('align', 'left')}
                            >
                                <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={(!selectedElement.align || selectedElement.align === 'center') ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateAttr('align', 'center')}
                            >
                                <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={selectedElement.align === 'right' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateAttr('align', 'right')}
                            >
                                <AlignRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

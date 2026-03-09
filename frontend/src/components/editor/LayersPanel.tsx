"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Unlock, GripVertical, Type, Image as ImageIcon, Square, Edit2, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const LayersPanel: React.FC = () => {
    const { elements, selectedElementId, selectElement, reorderElements, toggleVisibility, toggleLock, updateName, deleteElement } = useCanvasStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    // Create a reversed copy for display since bottom-to-top means first-to-last in array
    const displayElements = [...elements].reverse();

    const getIcon = (type: string, shapeType?: string) => {
        if (type === 'text') return <Type className="h-4 w-4" />;
        if (type === 'image') return <ImageIcon className="h-4 w-4" />;
        if (type === 'shape') {
            if (shapeType === 'circle') return <div className="h-3 w-3 rounded-full border-2 border-current" />;
            if (shapeType === 'line') return <div className="h-0.5 w-4 bg-current" />;
            return <Square className="h-4 w-4" />;
        }
        return <Square className="h-4 w-4" />;
    };

    const getLabel = (el: { label?: string; type: string; text?: string; shapeType?: string }) => {
        if (el.label) return el.label;
        if (el.type === 'text') return el.text ? `Text: ${el.text.substring(0, 10)}...` : 'Text';
        if (el.type === 'image') return 'Image';
        if (el.type === 'shape') return `Shape (${el.shapeType || 'rect'})`;
        return 'Element';
    };

    const startEditing = (id: string, currentLabel: string) => {
        setEditingId(id);
        setEditName(currentLabel);
    };

    const handleSaveName = (id: string) => {
        updateName(id, editName);
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') handleSaveName(id);
        if (e.key === 'Escape') setEditingId(null);
    };

    // Very simple up/down moving for now instead of complex drag-n-drop
    const moveUp = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const index = elements.findIndex(el => el.id === id);
        if (index > 0) reorderElements(index, index - 1); // Move backward in render array (down in layers list)
    };

    const moveDown = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const index = elements.findIndex(el => el.id === id);
        if (index < elements.length - 1) reorderElements(index, index + 1); // Move forward in render array (up in layers list)
    };

    if (elements.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-card">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Layers className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium">No layers yet</p>
                <p className="text-xs opacity-70 mt-1">Add shapes, text, or images to see them listed here.</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-full overflow-y-auto">
            <div className="p-2 space-y-1">
                {displayElements.map((el, i) => {
                    const isSelected = selectedElementId === el.id;
                    const label = getLabel(el);

                    return (
                        <div
                            key={el.id}
                            onClick={() => selectElement(el.id)}
                            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-card hover:bg-muted'}`}
                        >
                            <div className="flex flex-col gap-1 items-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={(e) => moveDown(el.id, e)}
                                    disabled={i === 0} // Top element in display (last in render array)
                                    title="Move up"
                                >
                                    <span className="text-[10px] leading-none">▲</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={(e) => moveUp(el.id, e)}
                                    disabled={i === displayElements.length - 1} // Bottom element in display (first in render array)
                                    title="Move down"
                                >
                                    <span className="text-[10px] leading-none">▼</span>
                                </Button>
                            </div>

                            <div className="text-muted-foreground flex-shrink-0">
                                {getIcon(el.type, el.shapeType)}
                            </div>

                            <div className="flex-1 min-w-0">
                                {editingId === el.id ? (
                                    <Input
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleSaveName(el.id)}
                                        onKeyDown={(e) => handleKeyDown(e, el.id)}
                                        className="h-6 text-xs px-1"
                                    />
                                ) : (
                                    <div
                                        className="text-xs truncate font-medium flex items-center gap-1 group"
                                        onDoubleClick={() => startEditing(el.id, label)}
                                    >
                                        {label}
                                        <Edit2
                                            className="h-3 w-3 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); startEditing(el.id, label); }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${el.locked ? 'text-amber-500' : 'text-muted-foreground'}`}
                                    onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                                    title={el.locked ? "Unlock" : "Lock"}
                                >
                                    {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${el.visible === false ? 'text-muted-foreground opacity-50' : 'text-foreground'}`}
                                    onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                                    title={el.visible === false ? "Show" : "Hide"}
                                >
                                    {el.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

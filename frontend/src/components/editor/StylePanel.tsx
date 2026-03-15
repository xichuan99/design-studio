"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { Trash2, MousePointer2 } from 'lucide-react';
import { MultiSelectPanel } from './style-panel/MultiSelectPanel';
import { GroupPanel } from './style-panel/GroupPanel';
import { GeneralStylePanel } from './style-panel/GeneralStylePanel';
import { TextStyleEditor } from './style-panel/TextStyleEditor';
import { ShapeStyleEditor } from './style-panel/ShapeStyleEditor';
import { ImageStyleEditor } from './style-panel/ImageStyleEditor';
import { EffectsPanel } from './style-panel/EffectsPanel';

export const StylePanel: React.FC = () => {
    const { elements, selectedElementIds, duplicateElement, deleteElement } = useCanvasStore();

    if (selectedElementIds.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-card">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MousePointer2 className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium">Belum ada elemen dipilih</p>
                <p className="text-xs opacity-70 mt-1">Klik pada elemen di canvas atau panel layer untuk mengedit panduan gaya.</p>
            </div>
        );
    }

    if (selectedElementIds.length > 1) {
        return <MultiSelectPanel />;
    }

    const selectedElement = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selectedElement) return null;

    if (selectedElement.type === 'group') {
        return <GroupPanel />;
    }

    return (
        <div className="w-full border-l bg-card flex flex-col h-full overflow-y-auto">
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
                <Accordion type="multiple" defaultValue={['general', 'typography', 'formatting', 'effects', 'shape-basic', 'shape-border', 'image-appearance']} className="w-full space-y-4">
                    <GeneralStylePanel />
                    {selectedElement.type === 'text' && <TextStyleEditor />}
                    {selectedElement.type === 'shape' && <ShapeStyleEditor />}
                    {selectedElement.type === 'image' && <ImageStyleEditor />}
                    {(selectedElement.type === 'text' || selectedElement.type === 'shape' || selectedElement.type === 'image') && (
                        <EffectsPanel />
                    )}
                </Accordion>
            </div>
        </div>
    );
};

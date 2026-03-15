"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function GroupPanel() {
    const { elements, selectedElementIds, duplicateElement, deleteElement, ungroupElements } = useCanvasStore();

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement || selectedElement.type !== 'group') return null;

    return (
        <div className="w-full border-l bg-card flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b font-medium flex justify-between items-center">
                <span className="capitalize">Group</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteElement(selectedElement.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="p-4">
                <Button variant="outline" className="w-full text-foreground hover:bg-muted" onClick={ungroupElements}>
                    Ungroup
                </Button>
            </div>
        </div>
    );
}

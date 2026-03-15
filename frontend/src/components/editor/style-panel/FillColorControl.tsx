"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { BrandSwatches } from "./BrandSwatches";

interface FillColorControlProps {
    label: string;
    defaultColor: string;
}

export function FillColorControl({ label, defaultColor }: FillColorControlProps) {
    const { elements, selectedElementIds, updateElement } = useCanvasStore();

    const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
    if (!selectedElement) return null;

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    const isGradient = selectedElement.fillType === 'gradient';
    const c1 = selectedElement.gradientColors?.[0] || selectedElement.fill || defaultColor;
    const c2 = selectedElement.gradientColors?.[1] || '#ffffff';
    const angle = selectedElement.gradientAngle || 90;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium">{label}</label>
                <div className="flex bg-muted rounded p-0.5">
                    <button 
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${!isGradient ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'}`}
                        onClick={() => updateAttr('fillType', 'solid')}
                    >
                        Solid
                    </button>
                    <button 
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${isGradient ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'}`}
                        onClick={() => {
                            updateElement(selectedElement.id, { 
                                fillType: 'gradient',
                                gradientColors: [c1, c2],
                                gradientAngle: angle
                            });
                        }}
                    >
                        Gradient
                    </button>
                </div>
            </div>

            {!isGradient ? (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                        <input
                            type="color"
                            className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                            value={selectedElement.fill || defaultColor}
                            onChange={(e) => updateAttr('fill', e.target.value)}
                        />
                        <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                            {(selectedElement.fill || defaultColor)}
                        </span>
                    </div>
                    <BrandSwatches onSelectColor={(c) => updateAttr('fill', c)} />
                </div>
            ) : (
                <div className="flex flex-col gap-2 p-2 bg-muted/30 border rounded-md">
                    <div className="flex gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[9px] text-muted-foreground">Color 1</span>
                            <input
                                type="color"
                                className="w-full h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                                value={c1}
                                onChange={(e) => updateAttr('gradientColors', [e.target.value, c2])}
                            />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[9px] text-muted-foreground">Color 2</span>
                            <input
                                type="color"
                                className="w-full h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                                value={c2}
                                onChange={(e) => updateAttr('gradientColors', [c1, e.target.value])}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] text-muted-foreground">Angle</span>
                            <span className="text-[9px] font-mono">{angle}°</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="360"
                            value={angle}
                            onChange={(e) => updateAttr('gradientAngle', parseInt(e.target.value))}
                            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

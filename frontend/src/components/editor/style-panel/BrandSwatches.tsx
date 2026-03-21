"use client";

import React from "react";
import { useBrandKit } from "@/hooks/useBrandKit";
import { Palette } from "lucide-react";

interface BrandSwatchesProps {
    onSelectColor: (hex: string) => void;
}

export function BrandSwatches({ onSelectColor }: BrandSwatchesProps) {
    const { activeBrandProfile } = useBrandKit();

    if (!activeBrandProfile || !activeBrandProfile.colors || activeBrandProfile.colors.length === 0) return null;

    return (
        <div className="flex items-center gap-1.5 mt-2 mb-1 bg-muted/50 p-1.5 rounded border">
            <Palette className="w-3 h-3 text-primary mr-0.5" />
            <div className="flex flex-wrap gap-1.5">
                {activeBrandProfile.colors.map((c, i) => (
                    <button
                        key={i}
                        className="w-5 h-5 rounded-full border border-border/50 shadow-sm hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ring-offset-1"
                        style={{ backgroundColor: c.hex }}
                        onClick={() => onSelectColor(c.hex)}
                        title={`${c.name} - ${c.role}`}
                    />
                ))}
            </div>
        </div>
    );
}

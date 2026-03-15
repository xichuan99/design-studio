"use client";

import React, { useEffect, useState } from "react";
import { useProjectApi, BrandKit } from "@/lib/api";
import { Palette } from "lucide-react";

interface BrandSwatchesProps {
    onSelectColor: (hex: string) => void;
}

export function BrandSwatches({ onSelectColor }: BrandSwatchesProps) {
    const api = useProjectApi();
    const [activeKit, setActiveKit] = useState<BrandKit | null>(null);

    useEffect(() => {
        api.getActiveBrandKit()
            .then(setActiveKit)
            .catch(err => console.error("Failed to load active brand kit", err));
    }, [api]);

    if (!activeKit) return null;

    return (
        <div className="flex items-center gap-1.5 mt-2 mb-1 bg-muted/50 p-1.5 rounded border">
            <Palette className="w-3 h-3 text-indigo-500 mr-0.5" />
            {activeKit.colors.map((c, i) => (
                <button
                    key={i}
                    className="w-4 h-4 rounded-full border border-border shadow-sm hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.hex }}
                    onClick={() => onSelectColor(c.hex)}
                    title={c.name}
                />
            ))}
        </div>
    );
}

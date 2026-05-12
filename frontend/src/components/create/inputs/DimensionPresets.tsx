import React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DimensionPresetsProps {
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    isInputLocked: boolean;
}

const QUICK_TARGET_PRESETS: Array<{ label: string; value: string }> = [
    { label: "Multi-format", value: "all" },
    { label: "Shopee", value: "1:1-shopee" },
    { label: "Tokopedia", value: "1:1-tokped" },
    { label: "Instagram", value: "4:5" },
    { label: "WhatsApp", value: "9:16-wa" },
];

export function DimensionPresets({
    aspectRatio,
    setAspectRatio,
    isInputLocked
}: DimensionPresetsProps) {
    return (
        <div className="space-y-4">
            <div>
                <Label className="text-sm font-medium mb-2 block">Target Channel</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {QUICK_TARGET_PRESETS.map((preset) => {
                        const isSelected = aspectRatio === preset.value;
                        return (
                            <button
                                key={preset.value}
                                type="button"
                                disabled={isInputLocked}
                                onClick={() => setAspectRatio(preset.value)}
                                className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                <Label className="text-sm font-medium mb-1 block">Format</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isInputLocked}>
                    <SelectTrigger>
                        <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Multi-Format</SelectLabel>
                            <SelectItem value="all">Semua Format — 1 brief, siap semua platform</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Sosial Media</SelectLabel>
                            <SelectItem value="1:1">IG Feed Square (1:1) — 1080×1080</SelectItem>
                            <SelectItem value="4:5">IG Feed (4:5) — 1080×1350</SelectItem>
                            <SelectItem value="9:16">IG Story / Reels (9:16) — 1080×1920</SelectItem>
                            <SelectItem value="9:16-wa">WA Story (9:16) — 1080×1920</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Marketplace</SelectLabel>
                            <SelectItem value="1:1-shopee">Shopee (1:1) — 1200×1200</SelectItem>
                            <SelectItem value="1:1-tokped">Tokopedia (1:1) — 1200×1200</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Umum</SelectLabel>
                            <SelectItem value="16:9">Lanskap (16:9)</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

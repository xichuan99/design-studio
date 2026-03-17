import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DimensionPresetsProps {
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    isInputLocked: boolean;
}

export function DimensionPresets({
    aspectRatio,
    setAspectRatio,
    isInputLocked
}: DimensionPresetsProps) {
    return (
        <div className="space-y-4">
            <div>
                <Label className="text-sm font-medium mb-1 block">Format</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isInputLocked}>
                    <SelectTrigger>
                        <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1:1">Postingan Square (1:1)</SelectItem>
                        <SelectItem value="9:16">Story / Reels (9:16)</SelectItem>
                        <SelectItem value="16:9">Lanskap (16:9)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

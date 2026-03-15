import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface GenerationOptionsProps {
    integratedText: boolean;
    setIntegratedText: (val: boolean) => void;
    isInputLocked: boolean;
}

export function GenerationOptions({
    integratedText,
    setIntegratedText,
    isInputLocked
}: GenerationOptionsProps) {
    return (
        <div className="p-3 bg-muted/30 rounded-lg border">
            <Label className="text-sm font-semibold mb-3 block">Mode Teks AI</Label>
            <RadioGroup
                value={integratedText ? "integrated" : "separated"}
                onValueChange={(val) => setIntegratedText(val === "integrated")}
                className="space-y-2 mt-2"
                disabled={isInputLocked}
            >
                <label htmlFor="separated" className={`flex flex-col space-y-1 p-2 border rounded-md cursor-pointer transition-colors ${!integratedText ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted'}`}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="separated" id="separated" />
                        <span className="font-medium text-sm">Teks Terpisah (Canvas)</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">Bersih & bisa diedit sesuka hati</span>
                </label>
                <label htmlFor="integrated" className={`flex flex-col space-y-1 p-2 border rounded-md cursor-pointer transition-colors ${integratedText ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted'}`}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="integrated" id="integrated" />
                        <span className="font-medium text-sm">Teks Menyatu (Gaya AI)</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-6">Menyatu estetik, tapi tak bisa diedit</span>
                </label>
                {integratedText && (
                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200">
                        ⚠️ Hanya cocok untuk teks pendek (1-3 kata). Teks panjang? Gunakan Magic Text di editor.
                    </div>
                )}
            </RadioGroup>
        </div>
    );
}

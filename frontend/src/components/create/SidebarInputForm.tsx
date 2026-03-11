import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ReferenceImageUpload } from "@/components/create/ReferenceImageUpload";

interface SidebarInputFormProps {
    rawText: string;
    setRawText: (val: string) => void;
    isInputLocked: boolean;
    isParsing: boolean;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    stylePreference: string;
    setStylePreference: (val: string) => void;
    integratedText: boolean;
    setIntegratedText: (val: boolean) => void;
    showManualRef: boolean;
    setShowManualRef: (val: boolean) => void;
    referenceFile: File | null;
    referencePreview: string | null;
    isDragOver: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveFile: () => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
}

export function SidebarInputForm({
    rawText, setRawText, isInputLocked, isParsing,
    aspectRatio, setAspectRatio, stylePreference, setStylePreference,
    integratedText, setIntegratedText,
    showManualRef, setShowManualRef, referenceFile, referencePreview, isDragOver,
    fileInputRef, handleFileInputChange, handleRemoveFile, handleDragOver, handleDragLeave, handleDrop
}: SidebarInputFormProps) {
    const formatStepNumber = showManualRef ? 3 : 2;

    return (
        <div className="space-y-6 pt-4">
            <div className="space-y-2 tour-step-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    Deskripsi Desain & Teks
                </label>
                <Textarea
                    placeholder="Contoh: Banner jualan es kopi susu dengan nuansa senja, ada tulisan 'Diskon 50% Akhir Pekan'"
                    className={`resize-none h-32 focus-visible:ring-primary ${isInputLocked ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    disabled={isInputLocked || isParsing}
                />
            </div>

            <div className={`space-y-2 pb-4 border-b ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                <ReferenceImageUpload
                    referenceFile={referenceFile}
                    referencePreview={referencePreview}
                    isDragOver={isDragOver}
                    fileInputRef={fileInputRef}
                    showManualRef={showManualRef}
                    selectedTemplate={null}
                    onFileInputChange={handleFileInputChange}
                    onRemoveFile={handleRemoveFile}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onShowManualRef={() => setShowManualRef(true)}
                    onHideManualRef={() => setShowManualRef(false)}
                />
            </div>

            <div className={`space-y-2 tour-step-2 ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">{formatStepNumber}</span>
                    Format & Gaya
                </label>
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

                <Select value={stylePreference} onValueChange={setStylePreference} disabled={isInputLocked}>
                    <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Gaya Desain" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="bold">Bold & Vibrant</SelectItem>
                        <SelectItem value="minimalist">Minimalist / Clean</SelectItem>
                        <SelectItem value="elegant">Elegant / Premium</SelectItem>
                        <SelectItem value="playful">Playful / Fun</SelectItem>
                    </SelectContent>
                </Select>

                <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
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
                    </RadioGroup>
                </div>
            </div>
        </div>
    );
}

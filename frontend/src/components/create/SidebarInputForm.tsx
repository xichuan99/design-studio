import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { BrandKit } from "@/lib/api";
import { Palette } from "lucide-react";
import { DimensionPresets } from "./inputs/DimensionPresets";
import { GenerationOptions } from "./inputs/GenerationOptions";
import { ProductSettings } from "./inputs/ProductSettings";

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
    removeProductBg: boolean;
    setRemoveProductBg: (val: boolean) => void;
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
    activeBrandKit: BrandKit | null;
}

export function SidebarInputForm({
    rawText, setRawText, isInputLocked, isParsing,
    aspectRatio, setAspectRatio, stylePreference, setStylePreference,
    integratedText, setIntegratedText,
    removeProductBg, setRemoveProductBg,
    showManualRef, setShowManualRef, referenceFile, referencePreview, isDragOver,
    fileInputRef, handleFileInputChange, handleRemoveFile, handleDragOver, handleDragLeave, handleDrop,
    activeBrandKit
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

                {/* Brand Kit Passive Badge */}
                {activeBrandKit && (
                    <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-md p-2 mt-2">
                        <div className="flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[11px] font-medium text-indigo-900">Brand Kit: {activeBrandKit.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                            {activeBrandKit.colors.slice(0, 5).map((c, i) => (
                                <div 
                                    key={i} 
                                    className="w-3.5 h-3.5 rounded-full border border-indigo-200/50 shadow-sm"
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className={`${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                <ProductSettings
                    referenceFile={referenceFile}
                    referencePreview={referencePreview}
                    isDragOver={isDragOver}
                    fileInputRef={fileInputRef}
                    showManualRef={showManualRef}
                    setShowManualRef={setShowManualRef}
                    removeProductBg={removeProductBg}
                    setRemoveProductBg={setRemoveProductBg}
                    handleFileInputChange={handleFileInputChange}
                    handleRemoveFile={handleRemoveFile}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                />
            </div>

            <div className={`space-y-4 tour-step-2 pt-2 ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">{formatStepNumber}</span>
                    Format & Gaya
                </label>
                
                <DimensionPresets 
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    stylePreference={stylePreference}
                    setStylePreference={setStylePreference}
                    isInputLocked={isInputLocked}
                />

                <GenerationOptions 
                    integratedText={integratedText}
                    setIntegratedText={setIntegratedText}
                    isInputLocked={isInputLocked}
                />
            </div>
        </div>
    );
}

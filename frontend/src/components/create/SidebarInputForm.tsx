import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { BrandKit } from "@/lib/api";
import { Palette, Wand2, ImagePlus } from "lucide-react";
import { DimensionPresets } from "./inputs/DimensionPresets";
import { GenerationOptions } from "./inputs/GenerationOptions";
import { ProductSettings } from "./inputs/ProductSettings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

interface SidebarInputFormProps {
    createMode: 'generate' | 'redesign';
    setCreateMode: (val: 'generate' | 'redesign') => void;
    redesignStrength: number;
    setRedesignStrength: (val: number) => void;
    rawText: string;
    setRawText: (val: string) => void;
    isInputLocked: boolean;
    isParsing: boolean;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
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
    createMode, setCreateMode, redesignStrength, setRedesignStrength,
    rawText, setRawText, isInputLocked, isParsing,
    aspectRatio, setAspectRatio,
    integratedText, setIntegratedText,
    removeProductBg, setRemoveProductBg,
    showManualRef, setShowManualRef, referenceFile, referencePreview, isDragOver,
    fileInputRef, handleFileInputChange, handleRemoveFile, handleDragOver, handleDragLeave, handleDrop,
    activeBrandKit
}: SidebarInputFormProps) {
    const formatStepNumber = showManualRef ? 3 : 2;

    return (
        <div className="space-y-6 pt-4">
            <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as 'generate' | 'redesign')} className="w-full mb-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="generate" disabled={isInputLocked} className="font-medium">
                        <Wand2 className="w-4 h-4 mr-2" />
                        Mulai dari Teks
                    </TabsTrigger>
                    <TabsTrigger value="redesign" disabled={isInputLocked} className="font-medium">
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Redesign
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className={`space-y-2 ${createMode === 'generate' ? 'tour-step-1' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    {createMode === 'generate' ? "Deskripsi Desain & Teks" : "Deskripsi Opsional"}
                </label>
                <Textarea
                    placeholder={createMode === 'generate' ? "Contoh: Banner promo teh manis panas dengan gaya ceria warna merah muda, ada tulisan 'Diskon 50%'" : "Contoh: Ubah suasananya jadi nuansa minimalis modern (Opsional)"}
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
                    showManualRef={createMode === 'redesign' ? true : showManualRef}
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

            {createMode === 'redesign' && (
                <div className={`space-y-4 pt-2 border-t ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                    <label className="flex items-center justify-between text-sm font-semibold text-foreground">
                        Kekuatan Redesign
                        <span className="text-muted-foreground font-normal">{Math.round(redesignStrength * 100)}%</span>
                    </label>
                    <Slider
                        value={[redesignStrength]}
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        onValueChange={([val]) => setRedesignStrength(val)}
                        disabled={isInputLocked}
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">Nilai lebih tinggi akan membuat AI lebih bebas berkreasi dari gambar asli. Default: 65%.</p>
                </div>
            )}

            <div className={`space-y-4 tour-step-2 pt-2 ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">{formatStepNumber}</span>
                    Format & Output
                </label>
                
                <DimensionPresets 
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
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

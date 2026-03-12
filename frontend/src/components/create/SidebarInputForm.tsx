import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ReferenceImageUpload } from "@/components/create/ReferenceImageUpload";
import { BrandKit } from "@/lib/api";
import { Palette } from "lucide-react";

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
                
                {referencePreview && (
                    <div className="pt-3">
                        <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-xl hover:bg-muted/50 transition-colors bg-card">
                            <div className="flex items-center h-5 mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={removeProductBg}
                                    onChange={(e) => setRemoveProductBg(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">Ini foto produk saya</span>
                                <span className="text-xs text-muted-foreground">Otomatis hapus background & taruh di atas desain AI yang baru.</span>
                            </div>
                        </label>
                    </div>
                )}
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
                        {integratedText && (
                            <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200">
                                ⚠️ Hanya cocok untuk teks pendek (1-3 kata). Teks panjang? Gunakan Magic Text di editor.
                            </div>
                        )}
                    </RadioGroup>
                </div>
            </div>
        </div>
    );
}

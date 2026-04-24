import React, { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { BrandKit } from "@/lib/api";
import { ChevronDown, Palette, Wand2, ImagePlus } from "lucide-react";
import { DimensionPresets } from "./inputs/DimensionPresets";
import { GenerationOptions } from "./inputs/GenerationOptions";
import { ProductSettings } from "./inputs/ProductSettings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import type { CreateStep } from "@/app/create/hooks/useCreateDesign";
import type { UserIntent } from "@/app/create/types";

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
    brandKitEnabled: boolean;
    setBrandKitEnabled: (val: boolean) => void;
    currentStep: CreateStep;
    userIntent: UserIntent;
    intentFirstEnabled?: boolean;
}

export function SidebarInputForm({
    createMode, setCreateMode, redesignStrength, setRedesignStrength,
    rawText, setRawText, isInputLocked, isParsing,
    aspectRatio, setAspectRatio,
    integratedText, setIntegratedText,
    removeProductBg, setRemoveProductBg,
    showManualRef, setShowManualRef, referenceFile, referencePreview, isDragOver,
    fileInputRef, handleFileInputChange, handleRemoveFile, handleDragOver, handleDragLeave, handleDrop,
    activeBrandKit, brandKitEnabled, setBrandKitEnabled,
    currentStep,
    userIntent,
    intentFirstEnabled = false,
}: SidebarInputFormProps) {
    const [referenceSettingsOverride, setReferenceSettingsOverride] = useState<boolean | null>(null);
    const formatStepNumber = showManualRef ? 3 : 2;
    const isGenerateMode = createMode === 'generate';
    const isIntentFlow = intentFirstEnabled && userIntent !== null;
    const isBriefStepActive = currentStep === 'input' || currentStep === 'brief';
    const isResultStepActive = currentStep === 'results' || currentStep === 'generating' || currentStep === 'preview';

    const intentLabel = useMemo(() => {
        if (userIntent === 'ad_from_photo') return 'Buat Iklan dari Foto';
        if (userIntent === 'clean_photo') return 'Rapikan Foto Produk';
        if (userIntent === 'content_from_text') return 'Buat Konten dari Teks';
        return null;
    }, [userIntent]);

    const showReferenceSettings =
        referenceSettingsOverride ?? (!isIntentFlow || userIntent !== 'content_from_text');

    return (
        <div className="space-y-6 pt-4">
            {isIntentFlow ? (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Flow Aktif</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{intentLabel}</p>
                    </div>
                    <ol className="grid grid-cols-3 gap-2">
                        <li>
                            <div className="rounded-md px-2 py-1.5 bg-primary/15 border border-primary/30 text-primary text-[11px] font-semibold text-center">1. Tujuan</div>
                        </li>
                        <li>
                            <div className={`rounded-md px-2 py-1.5 border text-[11px] font-semibold text-center ${isBriefStepActive ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                                2. Brief
                            </div>
                        </li>
                        <li>
                            <div className={`rounded-md px-2 py-1.5 border text-[11px] font-semibold text-center ${isResultStepActive ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                                3. Hasil
                            </div>
                        </li>
                    </ol>
                </div>
            ) : (
                <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as 'generate' | 'redesign')} className="w-full mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="generate" disabled={isInputLocked} className="font-medium">
                            <Wand2 className="w-4 h-4 mr-2" />
                            Buat dari Brief
                        </TabsTrigger>
                        <TabsTrigger value="redesign" disabled={isInputLocked} className="font-medium">
                            <ImagePlus className="w-4 h-4 mr-2" />
                            Ubah dari Foto
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            <div className={`space-y-2 ${isGenerateMode ? 'tour-step-1' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    {isIntentFlow
                        ? (userIntent === 'content_from_text' ? 'Brief Konten Anda' : 'Arah Visual Anda')
                        : (isGenerateMode ? "Tujuan Desain Anda" : "Arah Redesign")}
                </label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {isIntentFlow
                        ? (userIntent === 'content_from_text'
                            ? "Tulis poin promosi utama. Visual akan disusun otomatis dari brief ini."
                            : "Tulis hasil yang ingin dicapai agar AI menyiapkan visual yang tepat.")
                        : isGenerateMode
                        ? "Tulis hasil yang ingin Anda capai. Detail visual dan copy promosi bisa digabung dalam satu brief."
                        : "Jelaskan perubahan yang Anda inginkan agar foto referensi diarahkan ke tampilan baru."}
                </p>
                <Textarea
                    placeholder={isGenerateMode ? "Contoh: Buat poster promo teh manis untuk Instagram, nuansa ceria merah muda, ada headline 'Diskon 50%' dan ruang harga yang jelas" : "Contoh: Ubah fotonya jadi lebih premium, background lebih bersih, dan pencahayaan lebih hangat"}
                    className={`resize-none h-32 focus-visible:ring-primary ${isInputLocked ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    disabled={isInputLocked || isParsing}
                />

                {/* Brand Kit Toggle Action */}
                {activeBrandKit && (
                    <div className="mt-2">
                        {!brandKitEnabled ? (
                            <button
                                type="button"
                                onClick={() => setBrandKitEnabled(true)}
                                className="flex items-center gap-1.5 px-2 py-1.5 w-full rounded-md border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors group cursor-pointer"
                            >
                                <Palette className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                    + Aktifkan Brand Kit: {activeBrandKit.name}
                                </span>
                            </button>
                        ) : (
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-md p-2">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[11px] font-medium text-primary">Brand Kit Aktif: {activeBrandKit.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-5">
                                        {activeBrandKit.colors.slice(0, 5).map((c, i) => (
                                            <div 
                                                key={i} 
                                                className="w-4 h-4 rounded-full border border-white/40 ring-1 ring-black/20 shadow-md"
                                                style={{ backgroundColor: c.hex }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setBrandKitEnabled(false)}
                                    className="p-1 hover:bg-white/10 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    title="Nonaktifkan Brand Kit"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={`${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                {isIntentFlow ? (
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                        <button
                            type="button"
                            className="w-full flex items-center justify-between text-left"
                            onClick={() => setReferenceSettingsOverride(!showReferenceSettings)}
                        >
                            <div>
                                <p className="text-sm font-semibold text-foreground">Foto Produk / Referensi</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Opsional, tambahkan jika ingin acuan visual.</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-primary font-semibold">{showReferenceSettings ? 'Sembunyikan' : 'Tampilkan'}</span>
                                <ChevronDown className={`w-4 h-4 text-primary transition-transform ${showReferenceSettings ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ease-out ${showReferenceSettings ? 'max-h-[560px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
                            <ProductSettings
                                createMode={createMode}
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
                    </div>
                ) : (
                    <ProductSettings
                        createMode={createMode}
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
                )}
            </div>

            {createMode === 'redesign' && (
                <div className={`space-y-4 pt-2 border-t ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                    <label className="flex items-center justify-between text-sm font-semibold text-foreground">
                        Tingkat Perubahan
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
                    <p className="text-xs text-muted-foreground leading-relaxed">Semakin tinggi nilainya, semakin jauh hasil akhir bergerak dari foto asli. Default: 65%.</p>
                </div>
            )}

            <div className={`space-y-4 tour-step-2 pt-2 ${isInputLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">{formatStepNumber}</span>
                    Format Hasil
                </label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    Tentukan ukuran desain dan cara teks akan dipakai di hasil akhir.
                </p>
                
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

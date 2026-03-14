"use client";

import React, { useState, useRef } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi, BrandKit, Template } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ImagePlus, Wallpaper, RefreshCw, X, Square, Smartphone, Monitor, FileImage, Zap, Sparkle, Crown, Smile, Upload, Trash2 } from 'lucide-react';
import { InlineErrorBanner } from '@/components/feedback/InlineErrorBanner';
import { ErrorModal, ErrorModalType } from '@/components/feedback/ErrorModal';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1', icon: Square, desc: 'Persegi' },
    { id: '9:16', label: '9:16', icon: Smartphone, desc: 'Story' },
    { id: '16:9', label: '16:9', icon: Monitor, desc: 'Layar Lebar' },
    { id: '4:5', label: '4:5', icon: FileImage, desc: 'Post' }
];

const STYLE_PRESETS = [
    { id: 'bold', label: 'Bold', icon: Zap },
    { id: 'minimalist', label: 'Minimal', icon: Sparkle },
    { id: 'elegant', label: 'Elegant', icon: Crown },
    { id: 'playful', label: 'Playful', icon: Smile }
];

export const AIPromptPanel: React.FC = () => {
    const { setBackgroundUrl, addElement } = useCanvasStore();
    const { generateDesign, getJobStatus, getBrandKits, getTemplates, uploadImage } = useProjectApi();

    const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedBrandKit, setSelectedBrandKit] = useState<string>('none');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);

    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
    const [isUploadingProduct, setIsUploadingProduct] = useState(false);
    const [removeProductBg, setRemoveProductBg] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const fetchOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const [fetchedKits, fetchedTemplates] = await Promise.all([
                    getBrandKits(),
                    getTemplates()
                ]);
                setBrandKits(fetchedKits);
                setTemplates(fetchedTemplates);
            } catch (error) {
                console.error("Failed to load select options:", error);
            } finally {
                setIsLoadingOptions(false);
            }
        };
        fetchOptions();
    }, [getBrandKits, getTemplates]);

    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('bold');

    // Error state
    const [inlineError, setInlineError] = useState<{
        message: string;
        type: 'error' | 'warning';
    } | null>(null);
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        type: ErrorModalType;
        title?: string;
        description?: string;
    }>({ open: false, type: 'system' });

    const handleGenerate = async (retryPrompt?: string) => {
        const text = retryPrompt || prompt;
        if (!text.trim() && !productImageUrl) return;

        setIsGenerating(true);
        setInlineError(null);
        setGeneratedUrl(null);

        try {
            // Step 1: Start generation job via existing API
            const jobData = await generateDesign({
                raw_text: text || "Product photo",
                aspect_ratio: aspectRatio as '1:1' | '9:16' | '16:9' | '4:5',
                style_preference: style as 'bold' | 'minimalist' | 'elegant' | 'playful',
                integrated_text: false,
                brand_kit_id: selectedBrandKit !== 'none' ? selectedBrandKit : undefined,
                template_id: selectedTemplate !== 'none' ? selectedTemplate : undefined,
                product_image_url: productImageUrl ?? undefined,
                remove_product_bg: productImageUrl ? removeProductBg : undefined,
            });
            const jobId = jobData.job_id;

            // Step 2: If already completed synchronously (Gemini path)
            if (jobData.status === 'completed') {
                const statusData = await getJobStatus(jobId);
                if (statusData.status === 'completed' && statusData.result_url) {
                    setGeneratedUrl(statusData.result_url);
                } else {
                    throw new Error(statusData.error_message || 'Generation failed');
                }
            } else {
                // Step 3: Poll for completion (Celery async path)
                let attempts = 0;
                const maxAttempts = 60;

                while (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 2000));
                    const statusData = await getJobStatus(jobId);

                    if (statusData.status === 'completed') {
                        if (statusData.result_url) {
                            setGeneratedUrl(statusData.result_url);
                        } else {
                            throw new Error('No image URL returned');
                        }
                        break;
                    } else if (statusData.status === 'failed') {
                        throw new Error(statusData.error_message || 'Generation failed');
                    }
                    attempts++;
                }

                if (attempts >= maxAttempts) {
                    throw new Error('Generation timed out. Please try again.');
                }
            }
        } catch (err: unknown) {
            console.error('Generation error:', err);
            const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat generate';
            
            if (msg.toLowerCase().includes("pelanggaran") || msg.toLowerCase().includes("safety") || msg.toLowerCase().includes("nsfw")) {
                setErrorModal({
                    open: true,
                    type: 'safety',
                    title: 'Deskripsi Tidak Diizinkan',
                    description: msg,
                });
            } else if (msg.toLowerCase().includes("kredit") || msg.toLowerCase().includes("credit")) {
                setErrorModal({
                    open: true,
                    type: 'credits',
                    title: 'Kredit Habis',
                    description: msg,
                });
            } else if (msg.toLowerCase().includes("timed out") || msg.toLowerCase().includes("timeout")) {
                setInlineError({
                    message: "Generasi memakan waktu terlalu lama. Kredit Anda tidak terpotong.",
                    type: 'warning',
                });
            } else {
                setInlineError({
                    message: msg,
                    type: 'error',
                });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSetAsBackground = () => {
        if (!generatedUrl) return;
        setBackgroundUrl(generatedUrl);
        setGeneratedUrl(null);
        setPrompt('');
    };

    const handleAddAsElement = async () => {
        if (!generatedUrl) return;

        // Cap the image size
        const img = new window.Image();
        const proxyUrl = generatedUrl.startsWith('http')
            ? `/api/proxy-image?url=${encodeURIComponent(generatedUrl)}`
            : generatedUrl;
        img.src = proxyUrl;
        
        // Wait for image to load to get dimensions
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        const maxSize = 400;
        const originalWidth = img.naturalWidth || 1024;
        const originalHeight = img.naturalHeight || 1024;
        const scale = Math.min(
            maxSize / originalWidth,
            maxSize / originalHeight,
            1
        );

        addElement({
            type: 'image',
            x: 100,
            y: 100,
            width: originalWidth * scale,
            height: originalHeight * scale,
            url: generatedUrl,
            rotation: 0,
            label: 'AI Generated',
        });
        setGeneratedUrl(null);
        setPrompt('');
    };

    const handleRegenerate = () => {
        handleGenerate(prompt);
    };

    const handleDiscard = () => {
        setGeneratedUrl(null);
        setInlineError(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingProduct(true);
            const data = await uploadImage(file);
            if (data && data.url) {
                setProductImageUrl(data.url);
            }
        } catch (error) {
            console.error('Failed to upload product image:', error);
            setInlineError({
                type: 'error',
                message: 'Gagal mengunggah foto produk. Silakan coba lagi.'
            });
        } finally {
            setIsUploadingProduct(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Build proxy URL for preview thumbnail
    const previewUrl = generatedUrl && generatedUrl.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(generatedUrl)}`
        : generatedUrl;

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-4">
            <div className="flex items-center gap-2 border-b pb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">AI Image Generator</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                {/* Aspect Ratio Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Aspect Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                        {ASPECT_RATIOS.map((ratio) => {
                            const Icon = ratio.icon;
                            const isSelected = aspectRatio === ratio.id;
                            return (
                                <button
                                    key={ratio.id}
                                    onClick={() => setAspectRatio(ratio.id)}
                                    disabled={isGenerating}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border bg-card text-center transition-all",
                                        "hover:border-primary/50 hover:bg-muted/50",
                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary" : "border-border text-muted-foreground",
                                        isGenerating && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-medium block w-full truncate">{ratio.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Style Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gaya Visual</label>
                    <div className="grid grid-cols-4 gap-2">
                        {STYLE_PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = style === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => setStyle(preset.id)}
                                    disabled={isGenerating}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border bg-card text-center transition-all",
                                        "hover:border-primary/50 hover:bg-muted/50",
                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary" : "border-border text-muted-foreground",
                                        isGenerating && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-medium block w-full truncate">{preset.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Advanced Options */}
                <div className="grid grid-cols-2 gap-3 pb-2">
                    {/* Template Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Template Preset</label>
                        <Select 
                            value={selectedTemplate} 
                            onValueChange={setSelectedTemplate}
                            disabled={isGenerating || isLoadingOptions}
                        >
                            <SelectTrigger className="h-8 text-xs border-border/60 bg-card/80">
                                <SelectValue placeholder={isLoadingOptions ? "Memuat..." : "Pilih Template"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Tidak Pakai Template</SelectItem>
                                {templates.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Brand Kit Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Brand Kit</label>
                        <Select 
                            value={selectedBrandKit} 
                            onValueChange={setSelectedBrandKit}
                            disabled={isGenerating || isLoadingOptions}
                        >
                            <SelectTrigger className="h-8 text-xs border-border/60 bg-card/80">
                                <SelectValue placeholder={isLoadingOptions ? "Memuat..." : "Pilih Brand Kit"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Tidak Pakai Brand Kit</SelectItem>
                                {brandKits.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Product Composite */}
                <div className="space-y-3 pb-2 border-b">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Foto Produk Utama</label>
                        {productImageUrl && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setProductImageUrl(null)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    
                    {!productImageUrl ? (
                        <div 
                            className="border-2 border-dashed border-border/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploadingProduct ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                            ) : (
                                <Upload className="h-5 w-5 text-muted-foreground mb-2" />
                            )}
                            <span className="text-xs font-medium text-muted-foreground">Upload Foto Produk</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                disabled={isUploadingProduct || isGenerating}
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative w-full h-24 rounded-lg overflow-hidden border bg-muted/30">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={productImageUrl} 
                                    alt="Product" 
                                    className="w-full h-full object-contain"
                                    crossOrigin="anonymous"
                                />
                            </div>
                            <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border border-border/50">
                                <label htmlFor="remove-bg" className="text-[10px] font-medium cursor-pointer uppercase tracking-wider">Hapus Background</label>
                                <Switch 
                                    id="remove-bg" 
                                    checked={removeProductBg}
                                    onCheckedChange={setRemoveProductBg}
                                    disabled={isGenerating}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prompt</label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Deskripsikan gambar yang ingin di-generate. Setelah jadi, pilih untuk dijadikan background atau elemen canvas.
                    </p>
                    <Textarea
                        placeholder="Contoh: Latar belakang ruang tamu modern minimalis dengan cahaya alami..."
                        className="h-28 resize-none text-sm rounded-xl bg-card/80 border-border/60 focus-visible:ring-indigo-500/50"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>

                {/* Error Banner */}
                {inlineError && (
                    <InlineErrorBanner 
                        message={inlineError.message}
                        type={inlineError.type}
                        onRetry={() => {
                            setInlineError(null);
                            handleGenerate(prompt);
                        }}
                        onDismiss={() => setInlineError(null)}
                    />
                )}

                {/* Preview Card */}
                {generatedUrl && previewUrl && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Hasil Generate</label>
                        <div className="rounded-xl overflow-hidden border bg-muted/30 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="AI Generated"
                                className="w-full aspect-square object-cover"
                                crossOrigin="anonymous"
                            />
                        </div>

                        <div className="space-y-2">
                            <Button
                                className="w-full gap-2"
                                onClick={handleSetAsBackground}
                            >
                                <Wallpaper className="h-4 w-4" />
                                Jadikan Background
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleAddAsElement}
                            >
                                <ImagePlus className="h-4 w-4" />
                                Tambah ke Canvas
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 gap-1.5 text-muted-foreground"
                                    onClick={handleRegenerate}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Ulang
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 gap-1.5 text-muted-foreground"
                                    onClick={handleDiscard}
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Buang
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate Button (shown when no preview is active) */}
            {!generatedUrl && (
                <div className="pt-4 border-t mt-auto">
                    <Button
                        className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-[0_4px_14px_rgba(99,102,241,0.4)] border-0"
                        onClick={() => handleGenerate()}
                        disabled={isGenerating || !prompt.trim()}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Gambar AI
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Error Modal */}
            <ErrorModal
                open={errorModal.open}
                onClose={() => setErrorModal(prev => ({ ...prev, open: false }))}
                type={errorModal.type}
                title={errorModal.title}
                description={errorModal.description}
            />
        </div>
    );
};

"use client";

import React, { useState, useRef } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi, BrandKit, Template } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, ImagePlus, Wallpaper, RefreshCw, X, Square, Smartphone, Monitor, FileImage, Upload, Trash2, Film, Palette, Layout, History } from 'lucide-react';
import Image from 'next/image';
import { AiGeneration } from '@/lib/api/types';
import { InlineErrorBanner } from '@/components/feedback/InlineErrorBanner';
import { ErrorModal, ErrorModalType } from '@/components/feedback/ErrorModal';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { CreditConfirmDialog } from '@/components/credits/CreditConfirmDialog';
const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1', icon: Square, desc: 'Persegi' },
    { id: '9:16', label: '9:16', icon: Smartphone, desc: 'Story' },
    { id: '16:9', label: '16:9', icon: Monitor, desc: 'Layar Lebar' },
    { id: '4:5', label: '4:5', icon: FileImage, desc: 'Post' }
];

const STYLE_PRESETS = [
    { id: 'auto', label: 'Auto (Default)', icon: Sparkles },
    { id: 'macro', label: 'Ultra Macro', icon: ImagePlus },
    { id: 'cinematic', label: 'Cinematic', icon: Film },
    { id: 'comic', label: 'Comic/Pop-Art', icon: Palette },
    { id: 'infographic', label: 'Infographic', icon: Layout }
];

export const AIPromptPanel: React.FC = () => {
    const { setBackgroundUrl, addElement } = useCanvasStore();
    const { generateDesign, getJobStatus, getBrandKits, getTemplates, uploadImage, getMyGenerations, upscaleImage, removeBackground } = useProjectApi();

    const [activeTab, setActiveTab] = useState("generate");
    const [seed, setSeed] = useState<string>('');
    const [history, setHistory] = useState<AiGeneration[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const data = await getMyGenerations(20, 0);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        if (val === 'history') {
            fetchHistory();
        }
    };

    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('auto');

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
        actionLabel?: string;
        onAction?: () => void;
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
                style_preference: style,
                integrated_text: false,
                brand_kit_id: selectedBrandKit !== 'none' ? selectedBrandKit : undefined,
                template_id: selectedTemplate !== 'none' ? selectedTemplate : undefined,
                product_image_url: productImageUrl ?? undefined,
                remove_product_bg: productImageUrl ? removeProductBg : undefined,
                seed: seed ? seed : undefined,
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
            } else if (msg.toLowerCase().includes("storage quota") || msg.includes("413") || msg.toLowerCase().includes("penyimpanan penuh")) {
                setErrorModal({
                    open: true,
                    type: 'storage',
                    title: 'Penyimpanan Penuh',
                    description: 'Kuota penyimpanan Kamu sudah penuh. Hapus file lama di pengaturan untuk menambah ruang.',
                    actionLabel: 'Upgrade Storage',
                    onAction: () => {
                        window.location.href = '/settings?upgrade=storage';
                    },
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
                    message: "Generasi memakan waktu terlalu lama. Kredit Kamu tidak terpotong.",
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
            label: 'Visual AI',
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

    const checkAndDownloadImage = async (url: string): Promise<File> => {
        const proxyUrl = url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        return new File([blob], 'image.png', { type: blob.type });
    };

    const handleUpscale = async () => {
        if (!generatedUrl) return;
        setIsProcessingImage(true);
        setInlineError(null);
        try {
            const file = await checkAndDownloadImage(generatedUrl);
            const res = await upscaleImage(file, 2.0);
            setGeneratedUrl(res.url);
        } catch (err: unknown) {
            setInlineError({ message: err instanceof Error ? err.message : 'Gagal melakukan upscale', type: 'error' });
        } finally {
            setIsProcessingImage(false);
        }
    };

    const handleRemoveGeneratedBg = async () => {
        if (!generatedUrl) return;
        setIsProcessingImage(true);
        setInlineError(null);
        try {
            const file = await checkAndDownloadImage(generatedUrl);
            const res = await removeBackground(file);
            setGeneratedUrl(res.url);
        } catch (err: unknown) {
            setInlineError({ message: err instanceof Error ? err.message : 'Gagal menghapus background', type: 'error' });
        } finally {
            setIsProcessingImage(false);
        }
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

    const getAspectRatioClass = (ratioId: string) => {
        switch (ratioId) {
            case '9:16': return 'aspect-[9/16]';
            case '16:9': return 'aspect-video';
            case '4:5': return 'aspect-[4/5]';
            default: return 'aspect-square';
        }
    };

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-3">
            <div className="flex items-center gap-2 border-b pb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">AI Image Studio</h2>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="generate">Buat Visual</TabsTrigger>
                    <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" /> Riwayat</TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex mt-0">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                {/* Prompt Input */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brief Visual</label>
                    <Textarea
                        placeholder="Contoh: Latar belakang minimalis dengan cahaya alami untuk produk skincare premium..."
                        className="h-20 resize-none text-sm rounded-xl bg-card/80 border-border/60 focus-visible:ring-indigo-500/50"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isGenerating}
                        onFocus={(e) => {
                            if (window.innerWidth <= 768) {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 300);
                            }
                        }}
                    />
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Format Output</label>
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
                                    <span className="text-xs font-medium block w-full truncate">{ratio.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Style Selector */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gaya Visual</label>
                    <div className="grid grid-cols-2 gap-2">
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
                                    title={preset.label}
                                >
                                    <Icon className="h-4 w-4 mb-1" />
                                    <span className="text-xs font-medium">{preset.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Advanced Options wrapped in <details> */}
                <details className="group border border-border/60 rounded-lg open:bg-muted/10 open:pb-3">
                    <summary className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer list-none flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg group-open:rounded-b-none">
                        Pengaturan Lanjutan
                        <span className="transition duration-200 group-open:rotate-180">▼</span>
                    </summary>
                    <div className="px-3 pt-3 space-y-5 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-3 pb-2">
                    {/* Seed Input */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seed (Opsional)</label>
                        <Input 
                            type="text"
                            placeholder="Contoh: 12345 atau random text"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            disabled={isGenerating}
                            className="h-8 text-xs border-border/60 bg-card/80"
                        />
                        <p className="text-[10px] text-muted-foreground">Isi dengan nilai untuk hasil yang konsisten pada prompt yang sama.</p>
                    </div>

                    {/* Template Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Preset</label>
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
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Kit</label>
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
                <div className="space-y-3 pb-2 border-b border-border/60">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Foto Produk Utama</label>
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
                                <Image 
                                    src={productImageUrl} 
                                    alt="Product" 
                                    fill
                                    className="object-contain"
                                    crossOrigin="anonymous"
                                    unoptimized={productImageUrl.startsWith('http')}
                                />
                            </div>
                            <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border border-border/50">
                                <label htmlFor="remove-bg" className="text-xs font-medium cursor-pointer uppercase tracking-wider">Hapus Background</label>
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

                    </div>
                </details>

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

                {/* Loading Skeleton */}
                {isGenerating && !generatedUrl && (
                    <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                        <label className="text-xs font-semibold text-primary uppercase flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Sedang Menyiapkan Visual...
                        </label>
                        <div className={cn("relative rounded-xl overflow-hidden border border-primary/20 bg-muted/20 shadow-sm w-full", getAspectRatioClass(aspectRatio))}>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                    <Sparkles className="h-8 w-8 text-primary/60 relative z-10 animate-spin-slow" />
                                </div>
                                <div className="space-y-2 w-1/2 opacity-60">
                                    <div className="h-2 bg-primary/20 rounded-full animate-pulse"></div>
                                    <div className="h-2 bg-primary/20 rounded-full w-4/5 mx-auto animate-pulse delay-75"></div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                )}

                {/* Preview Card */}
                {generatedUrl && previewUrl && !isGenerating && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Hasil Terbaru</label>
                        <div className={cn("relative rounded-xl overflow-hidden border bg-muted/30 shadow-sm w-full", getAspectRatioClass(aspectRatio))}>
                            <Image
                                src={previewUrl}
                                alt="Hasil visual AI"
                                fill
                                className="object-cover rounded shadow-sm"
                                crossOrigin="anonymous"
                                unoptimized={previewUrl.startsWith('http')}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1.5"
                                    onClick={handleRemoveGeneratedBg}
                                    disabled={isProcessingImage}
                                >
                                    {isProcessingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                                    Hapus BG
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1.5"
                                    onClick={handleUpscale}
                                    disabled={isProcessingImage}
                                >
                                    {isProcessingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                                    Upscale
                                </Button>
                            </div>
                            <Button
                                className="w-full gap-2"
                                onClick={handleSetAsBackground}
                            >
                                <Wallpaper className="h-4 w-4" />
                                Pakai Jadi Background
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleAddAsElement}
                            >
                                <ImagePlus className="h-4 w-4" />
                                Masukkan ke Canvas
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 gap-1.5 text-muted-foreground"
                                    onClick={handleRegenerate}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Buat Ulang
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
                    <CreditConfirmDialog
                        title="Buat Visual AI"
                        description="Pastikan brief dan pengaturan sudah sesuai sebelum membuat hasil baru."
                        cost={40}
                        onConfirm={() => handleGenerate()}
                        disabled={isGenerating || (!prompt.trim() && !productImageUrl)}
                    >
                        <Button
                            className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-[0_4px_14px_rgba(99,102,241,0.4)] border-0"
                            disabled={isGenerating || (!prompt.trim() && !productImageUrl)}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Menyiapkan Visual...
                                </>
                            ) : (
                                <div className="flex items-center justify-between w-full">
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Buat Visual AI
                                    </span>
                                    <CreditCostBadge cost={40} className="bg-white/20 text-white border-white/20" showTooltip={false} />
                                </div>
                            )}
                        </Button>
                    </CreditConfirmDialog>
                </div>
            )}
                </TabsContent>

                <TabsContent value="history" className="flex-1 overflow-y-auto mt-0 data-[state=active]:flex flex-col gap-3 pr-1 pb-4">
                    {isLoadingHistory ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">Belum ada riwayat generasi.</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {history.map(item => (
                                <div key={item.id} className="group relative rounded-lg border bg-card overflow-hidden">
                                    <div className="aspect-square relative bg-muted/30">
                                        <Image src={item.result_url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(item.result_url)}` : item.result_url} alt="History" fill className="object-cover" crossOrigin="anonymous" unoptimized={item.result_url.startsWith('http')} />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                            <Button size="sm" variant="secondary" className="w-full text-[10px] h-7" onClick={() => {
                                                if (item.raw_text) setPrompt(item.raw_text);
                                                if (item.seed) setSeed(item.seed);
                                                setActiveTab("generate");
                                            }}>Pakai Prompt & Seed</Button>
                                            <Button size="sm" variant="default" className="w-full text-[10px] h-7" onClick={() => {
                                                setBackgroundUrl(item.result_url);
                                            }}>Jadikan BG</Button>
                                        </div>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <p className="text-[10px] text-muted-foreground line-clamp-2">{item.raw_text || item.visual_prompt || "No prompt"}</p>
                                        {item.seed && <p className="text-[9px] font-mono text-primary/80">Seed: {item.seed}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Error Modal */}
            <ErrorModal
                open={errorModal.open}
                onClose={() => setErrorModal(prev => ({ ...prev, open: false }))}
                type={errorModal.type}
                title={errorModal.title}
                description={errorModal.description}
                actionLabel={errorModal.actionLabel}
                onAction={errorModal.onAction}
            />
        </div>
    );
};

"use client";

import React, { useState } from 'react';
import { AppHeader } from "@/components/layout/AppHeader";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Download, PenSquare, Type, Wand2, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";
import { cn } from "@/lib/utils";
import { CreditConfirmDialog } from '@/components/credits/CreditConfirmDialog';

export default function TextBannerPage() {
    const router = useRouter();
    const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();
    
    const [step, setStep] = useState(1);
    const [text, setText] = useState('');
    const [style, setStyle] = useState('ribbon');
    const [customStyle, setCustomStyle] = useState('');
    const [colorHint, setColorHint] = useState('');
    const [quality, setQuality] = useState<'draft' | 'standard' | 'premium'>('standard');
    
    const [resultUrl, setResultUrl] = useState<string>('');

    const STYLE_PRESETS = [
        { key: 'ribbon', label: '🎀 Ribbon Banner' },
        { key: 'badge', label: '🏷️ Badge / Sticker' },
        { key: 'cloud', label: '☁️ Cloud Bubble' },
        { key: 'star', label: '⭐ Starburst' },
        { key: 'banner', label: '📜 Classic Scroll' },
        { key: 'custom', label: '✨ Custom Style...' },
    ];

    const handleGenerate = async () => {
        if (!text.trim()) {
            toast.error('Silakan isi teks untuk banner.');
            return;
        }
        if (style === 'custom' && !customStyle.trim()) {
            toast.error('Silakan definisikan gaya kustom Anda.');
            return;
        }

        try {
            const resolvedStyle = style === 'custom' ? customStyle : style;
            await startToolJob({
                toolName: 'text_banner',
                payload: {
                    text,
                    style: resolvedStyle,
                    color_hint: colorHint,
                    quality,
                },
                idempotencyKey: `${text}:${resolvedStyle}:${colorHint}:${quality}`,
                onCompleted: (job) => {
                    if (job.result_url) {
                        setResultUrl(job.result_url);
                        setStep(2);
                        toast.success('Banner berhasil dibuat');
                    }
                },
                onFailed: (job) => {
                    toast.error(job.error_message || 'Gagal membuat banner');
                },
                onCanceled: () => {
                    toast.message('Proses text banner dibatalkan');
                },
                onError: (error) => {
                    if (error instanceof Error) {
                        toast.error(error.message);
                    } else {
                        toast.error('Gagal memantau status text banner');
                    }
                },
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Gagal membuat banner. Silakan coba lagi.';
            toast.error(errorMessage);
        }
    };

    const handleCancel = async () => {
        await cancelActiveJob({
            onCanceled: () => toast.message('Proses text banner dibatalkan'),
            onError: (error) => {
                if (error instanceof Error) {
                    toast.error(error.message);
                } else {
                    toast.error('Gagal membatalkan proses');
                }
            },
        });
    };

    const cost = quality === 'premium' ? 40 : 10;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
                <Button
                    variant="ghost"
                    className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => step > 1 ? setStep(1) : router.push("/tools")}
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 select-none">
                    {[
                        { label: "Atur Banner", n: 1 },
                        { label: "Hasil Akhir", n: 2 },
                    ].map(({ label, n }, i, arr) => (
                        <div key={n} className="flex items-center gap-1 sm:gap-2">
                            <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === n ? "bg-primary text-primary-foreground shadow-md" : step > n ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">{n}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </div>
                            {i < arr.length - 1 && (
                                <div className={`w-4 sm:w-8 h-[2px] ${step > n ? "bg-primary/40" : "bg-border"}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="mb-8 text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Text Banner</h1>
                    <p className="text-muted-foreground mt-2">Buat banner teks dekoratif berkualitas tinggi dengan background transparan untuk promosi Anda.</p>
                </div>

                {step === 1 && (
                    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm max-w-2xl mx-auto space-y-6">
                        
                        {/* Text Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Type className="w-4 h-4 text-primary" /> Teks Banner
                            </label>
                            <Input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Contoh: DISKON BESAR!"
                                className="text-base h-12 focus-visible:ring-primary/50"
                            />
                        </div>

                        {/* Style Preset Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Wand2 className="w-4 h-4 text-primary" /> Gaya Banner
                            </label>
                            <Select value={style} onValueChange={setStyle}>
                                <SelectTrigger className="w-full text-base h-12">
                                    <SelectValue placeholder="Pilih gaya" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STYLE_PRESETS.map(p => (
                                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            {/* Custom Style Textarea */}
                            {style === 'custom' && (
                                <Textarea
                                    value={customStyle}
                                    onChange={(e) => setCustomStyle(e.target.value)}
                                    placeholder="Contoh: huruf elegan metalik 3d dengan efek neon"
                                    className="min-h-[80px] text-sm mt-3 focus-visible:ring-primary/50"
                                />
                            )}
                        </div>

                        {/* Color Hint */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Palette className="w-4 h-4 text-primary" /> Petunjuk Warna (Opsional)
                            </label>
                            <Input
                                type="text"
                                value={colorHint}
                                onChange={(e) => setColorHint(e.target.value)}
                                placeholder="Contoh: emas dan hitam"
                                className="text-base h-12 focus-visible:ring-primary/50"
                            />
                        </div>

                        {/* Quality Selection */}
                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-semibold text-foreground">Kualitas Generasi</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'draft', label: 'Draft', cost: '1 Credit' },
                                    { id: 'standard', label: 'Standard', cost: '1 Credit' },
                                    { id: 'premium', label: 'Premium', cost: '2 Credits' },
                                ].map((q) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setQuality(q.id as 'draft'|'standard'|'premium')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all",
                                            quality === q.id 
                                                ? (q.id === 'premium' ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-md" : "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md") 
                                                : "border-border bg-background hover:bg-muted/50 hover:border-border/80"
                                        )}
                                    >
                                        <span className={cn("text-sm font-semibold mb-1", quality === q.id ? (q.id === 'premium' ? "text-amber-500" : "text-foreground") : "text-muted-foreground")}>{q.label}</span>
                                        <span className="text-xs text-muted-foreground/80 font-medium">{q.cost}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t">
                            <ToolProcessingState
                                loading={loading}
                                job={activeJob}
                                defaultMessage="AI sedang membuat text banner"
                                onCancel={handleCancel}
                            />
                            <CreditConfirmDialog
                                title="Buat AI Text Banner"
                                description={`Membuat banner teks berkualitas ${quality}. Proses ini membutuhkan ${cost} kredit.`}
                                cost={cost}
                                onConfirm={handleGenerate}
                                disabled={loading || !text.trim()}
                            >
                                <Button
                                    disabled={loading || !text.trim()}
                                    className="w-full text-base h-12 gap-2 font-bold shadow-md hover:shadow-lg transition-all"
                                    size="lg"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Membuat...</>
                                    ) : (
                                        <>✨ Generate Text Banner ({cost} Kredit)</>
                                    )}
                                </Button>
                            </CreditConfirmDialog>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 max-w-2xl mx-auto">
                        <div className="bg-checkered rounded-2xl border border-border shadow-inner p-6 flex items-center justify-center min-h-[400px] relative">
                            {resultUrl && (
                                <Image 
                                    src={resultUrl} 
                                    alt="Generated Banner" 
                                    width={800} 
                                    height={800} 
                                    className="w-full h-auto max-h-[500px] object-contain drop-shadow-2xl" 
                                    unoptimized 
                                />
                            )}
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center">
                            <Button size="lg" variant="outline" onClick={() => setStep(1)}>
                                <span className="mr-2">♻️</span> Buat Banner Lainnya
                            </Button>
                            <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => window.open(resultUrl, "_blank")}>
                                <Download className="w-5 h-5" /> Download Resolusi Tinggi
                            </Button>
                            <Button size="lg" variant="secondary" className="gap-2" onClick={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}>
                                <PenSquare className="w-5 h-5" /> Gunakan di Desain Baru
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

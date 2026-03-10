"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ImagePlus, Wallpaper, RefreshCw, X } from 'lucide-react';

export const AIPromptPanel: React.FC = () => {
    const { setBackgroundUrl, addElement } = useCanvasStore();
    const { generateDesign, getJobStatus } = useProjectApi();

    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    const handleGenerate = async (retryPrompt?: string) => {
        const text = retryPrompt || prompt;
        if (!text.trim()) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedUrl(null);

        try {
            // Step 1: Start generation job via existing API
            const jobData = await generateDesign({
                raw_text: text,
                aspect_ratio: '1:1',
                style_preference: 'bold',
                integrated_text: false,
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
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat generate');
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

    const handleAddAsElement = () => {
        if (!generatedUrl) return;
        addElement({
            type: 'image',
            x: 100,
            y: 100,
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
        setError(null);
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Prompt</label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Deskripsikan gambar yang ingin di-generate. Setelah jadi, pilih untuk dijadikan background atau elemen canvas.
                    </p>
                    <Textarea
                        placeholder="Contoh: Latar belakang ruang tamu modern minimalis dengan cahaya alami..."
                        className="h-28 resize-none text-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isGenerating}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                        {error}
                    </div>
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
                        className="w-full gap-2"
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
        </div>
    );
};

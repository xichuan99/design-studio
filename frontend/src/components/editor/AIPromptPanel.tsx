"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Image as ImageIcon } from 'lucide-react';

export const AIPromptPanel: React.FC = () => {
    const { setBackgroundUrl } = useCanvasStore();
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const tokenResponse = await fetch('/api/auth/token');
            const data = await tokenResponse.json();
            const token = data.token;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/v1/generate/image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: prompt }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to generate image');
            }

            const result = await response.json();

            // Use proxy to avoid CORS
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(result.image_url)}`;
            setBackgroundUrl(proxyUrl);
            setPrompt('');

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || 'An error occurred during generation');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-4">
            <div className="flex items-center gap-2 border-b pb-4">
                <Wand2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">AI Generator</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Image Prompt</label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Describe the background image you want to generate. This will replace the current canvas background.
                    </p>
                    <Textarea
                        placeholder="e.g. A modern minimalist living room with sunlight streaming through large windows..."
                        className="h-32 resize-none text-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                        {error}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t mt-auto">
                <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Generate Background
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

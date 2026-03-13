import React, { useState } from 'react';
import { useProjectApi } from '@/lib/api';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Loader2, Type, Palette, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const TextBannerPanel = () => {
    const { generateTextBanner } = useProjectApi();
    const { addElement } = useCanvasStore();

    const [text, setText] = useState('');
    const [style, setStyle] = useState('ribbon');
    const [customStyle, setCustomStyle] = useState('');
    const [colorHint, setColorHint] = useState('');
    const [quality, setQuality] = useState<'draft' | 'standard' | 'premium'>('standard');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setError('Please enter some text for the banner.');
            return;
        }

        if (style === 'custom' && !customStyle.trim()) {
            setError('Please describe your custom style.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateTextBanner({
                text,
                style: style === 'custom' ? customStyle : style,
                color_hint: colorHint,
                quality
            });

            if (result.url) {
                // Add the generated banner to the canvas
                addElement({
                    type: 'image',
                    url: result.url,
                    x: 100,
                    y: 100,
                    width: result.width || 400,
                    height: result.height || 150,
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    label: 'AI Banner',
                });
            } else {
                throw new Error('No image URL returned from server.');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate banner. Please try again.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-4">
            <div className="flex items-center gap-2 border-b pb-4">
                <Wand2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">AI Text Banner</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Generate high-quality decorative text banners with transparent backgrounds to composite over your designs.
                </p>

                <div className="space-y-5">
                {/* Text Input */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5" /> Banner Text
                    </label>
                    <Input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. SUMMER SALE"
                        className="text-sm focus-visible:ring-primary/50"
                    />
                </div>

                {/* Style Preset Dropdown */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5" /> Banner Style
                    </label>
                    <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                            {STYLE_PRESETS.map(p => (
                                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {/* Custom Style Textarea (shown only when "custom" selected) */}
                    {style === 'custom' && (
                        <Textarea
                            value={customStyle}
                            onChange={(e) => setCustomStyle(e.target.value)}
                            placeholder="e.g. elegant 3d metallic lettering with neon glow"
                            className="min-h-[80px] max-h-[160px] resize-y text-sm mt-2 focus-visible:ring-primary/50"
                        />
                    )}
                </div>

                {/* Color Hint */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" /> Color Hint (Optional)
                    </label>
                    <Input
                        type="text"
                        value={colorHint}
                        onChange={(e) => setColorHint(e.target.value)}
                        placeholder="e.g. gold and black"
                        className="text-sm focus-visible:ring-primary/50"
                    />
                </div>

                {/* Quality / Tier Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        Generation Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                         <button
                            onClick={() => setQuality('draft')}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                                quality === 'draft' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50"
                            )}
                        >
                            <span className={cn("text-xs font-medium mb-1", quality === 'draft' ? "text-foreground" : "text-muted-foreground")}>Draft</span>
                            <span className="text-[11px] text-muted-foreground/80">1 Credit</span>
                        </button>
                        <button
                            onClick={() => setQuality('standard')}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                                quality === 'standard' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50"
                            )}
                        >
                            <span className={cn("text-xs font-medium mb-1", quality === 'standard' ? "text-foreground" : "text-muted-foreground")}>Standard</span>
                            <span className="text-[11px] text-muted-foreground/80">1 Credit</span>
                        </button>
                        <button
                            onClick={() => setQuality('premium')}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                                quality === 'premium' ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-border hover:bg-muted/50"
                            )}
                            title="Uses Nano Banana 2 (Gemini Flash 3.1) - Best text accuracy"
                        >
                            <span className={cn("text-xs font-medium mb-1", quality === 'premium' ? "text-amber-500" : "text-muted-foreground")}>Premium</span>
                            <span className="text-[11px] text-muted-foreground/80">2 Credits</span>
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}
            </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4 border-t mt-auto">
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim()}
                    className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-[0_4px_14px_rgba(99,102,241,0.4)] border-0"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Banner...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Generate AI Banner
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

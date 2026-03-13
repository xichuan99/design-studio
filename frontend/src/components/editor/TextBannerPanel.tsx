import React, { useState } from 'react';
import { useProjectApi } from '@/lib/api';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Loader2, Type, Palette, Wand2 } from 'lucide-react';

export const TextBannerPanel = () => {
    const { generateTextBanner } = useProjectApi();
    const { addElement } = useCanvasStore();

    const [text, setText] = useState('');
    const [style, setStyle] = useState('elegant 3d lettering, neon glow');
    const [colorHint, setColorHint] = useState('');
    const [quality, setQuality] = useState<'draft' | 'standard' | 'premium'>('standard');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError('Please enter some text for the banner.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateTextBanner({
                text,
                style,
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
                    // Note: zIndex and opacity are not directly in CanvasElement, 
                    // though opacity is. 'locked' is.
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
        <div className="p-4 flex flex-col h-full bg-neutral-900 text-white overflow-y-auto w-full">
            <div className="mb-6 flex items-center space-x-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">AI Text Banner</h2>
            </div>
            
            <p className="text-sm text-neutral-400 mb-6">
                Generate high-quality decorative text banners with transparent backgrounds to composite over your designs.
            </p>

            <div className="space-y-5">
                {/* Text Input */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center">
                        <Type className="w-3.5 h-3.5 mr-1" /> Banner Text
                    </label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. SUMMER SALE"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Style Hint */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center">
                        <Wand2 className="w-3.5 h-3.5 mr-1" /> Visual Style
                    </label>
                    <textarea
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="e.g. elegant 3d lettering, neon glow"
                        rows={2}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    />
                </div>

                {/* Color Hint */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center">
                        <Palette className="w-3.5 h-3.5 mr-1" /> Color Hint (Optional)
                    </label>
                    <input
                        type="text"
                        value={colorHint}
                        onChange={(e) => setColorHint(e.target.value)}
                        placeholder="e.g. gold and black"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Quality / Tier Selection */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                        Generation Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                         <button
                            onClick={() => setQuality('draft')}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                                quality === 'draft' 
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            }`}
                        >
                            <span className="font-semibold mb-1">Draft</span>
                            <span className="text-[10px] opacity-70">1 Credit</span>
                        </button>
                        <button
                            onClick={() => setQuality('standard')}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                                quality === 'standard' 
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            }`}
                        >
                            <span className="font-semibold mb-1">Standard</span>
                            <span className="text-[10px] opacity-70">1 Credit</span>
                        </button>
                        <button
                            onClick={() => setQuality('premium')}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                                quality === 'premium' 
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            }`}
                            title="Uses Nano Banana 2 (Gemini Flash 3.1) - Best text accuracy"
                        >
                            <span className="font-semibold mb-1">Premium</span>
                            <span className="text-[10px] opacity-70">2 Credits</span>
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200 text-xs">
                        {error}
                    </div>
                )}

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full mt-4 flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating Banner...
                        </>
                    ) : (
                        'Generate AI Banner'
                    )}
                </button>
            </div>
        </div>
    );
};

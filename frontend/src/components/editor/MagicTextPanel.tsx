"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Wand2, AlertTriangle, Type, Crown, Smile } from 'lucide-react';
import WebFont from 'webfontloader';
import { cn } from '@/lib/utils';

const STYLE_PRESETS = [
    { id: 'Bold & Impactful', label: 'Bold', icon: Type, description: 'Loud & clear' },
    { id: 'Elegant & Clean', label: 'Elegant', icon: Crown, description: 'Premium feel' },
    { id: 'Fun & Playful', label: 'Playful', icon: Smile, description: 'Casual & popping' }
];

export const MagicTextPanel: React.FC = () => {
    const { stageRef, addMagicTextElements, appendMagicTextElements, backgroundUrl, elements, canvasWidth, canvasHeight } = useCanvasStore();
    const { generateMagicTextLayout } = useProjectApi();

    const [text, setText] = useState('');
    const [styleHint, setStyleHint] = useState<string>(STYLE_PRESETS[0].id);
    const [mode, setMode] = useState<'replace' | 'append'>('replace');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        
        if (!backgroundUrl && (elements.length === 0)) {
            setWarning("Disarankan untuk menambahkan gambar background atau elemen lain dulu agar AI punya konteks desain.");
        } else {
            setWarning(null);
        }

        if (!stageRef) {
            setError("Canvas belum siap.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // 1. Dapatkan base64 dari kanvas
            const dataUrl = stageRef.toDataURL({ pixelRatio: 1 });

            // 2. Kirim ke backend (dengan timeout 30 detik)
            const apiCall = generateMagicTextLayout({
                image_base64: dataUrl,
                text: text,
                style_hint: styleHint,
                canvas_width: canvasWidth,
                canvas_height: canvasHeight
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("AI terlalu lama merespons (timeout 30 detik). Silakan coba lagi.")), 30000);
            });

            // Define the expected response shape
            interface APIResponse {
                elements?: Array<{
                    text: string;
                    font_family: string;
                    font_size: number;
                    font_weight: number;
                    color: string;
                    align: string;
                    x: number;
                    y: number;
                    letter_spacing?: number;
                    line_height?: number;
                    text_transform?: string;
                    text_shadow?: string;
                    opacity?: number;
                    rotation?: number;
                    background_color?: string;
                    background_padding?: number;
                    background_radius?: number;
                }>;
            }

            const response = await Promise.race([apiCall, timeoutPromise]) as APIResponse;

            if (response && response.elements && response.elements.length > 0) {
                // 3. Preload font sebelum memasukkan node ke canvas agar tidak terjadi glitch
                const families = Array.from(new Set(response.elements.map(el => el.font_family)));
                
                // Gunakan promise wrapper untuk WebFont.load
                await new Promise<void>((resolve) => {
                    WebFont.load({
                        google: {
                            families: families.map(f => `${f as string}:400,700,900`),
                        },
                        active: () => resolve(),
                        inactive: () => resolve(), // Lanjut jika gagal memuat
                    });
                });

                // Logical canvas dimensions (NOT stageRef.width which is viewport 1080px)
                // Elements in the store use 1024-based logical coordinates
                const logicalWidth = 1024;
                const logicalHeight = 1024;

                // 4. Transform response (proportional 0.0-1.0) to absolute logical coordinates
                const margin = 40;
                
                const newNodes = response.elements.map((el, idx: number) => {
                    const absX = el.x * logicalWidth;
                    
                    // Hitung lebar maksimal teks agar wrap dengan baik
                    let width = logicalWidth - (margin * 2);
                    if (el.align === 'center') {
                        width = logicalWidth * 0.8;
                    } else if (el.align === 'left') {
                        width = logicalWidth - absX - margin;
                    } else if (el.align === 'right') {
                        width = absX;
                    }

                    // Parse CSS-like text_shadow roughly
                    let shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY;
                    if (el.text_shadow) {
                        const parts = el.text_shadow.split(' ');
                        if (parts.length >= 4) {
                            shadowOffsetX = parseFloat(parts[0]);
                            shadowOffsetY = parseFloat(parts[1]);
                            shadowBlur = parseFloat(parts[2]);
                            shadowColor = parts.slice(3).join(' '); // e.g. rgba(0,0,0,0.5)
                        }
                    }

                    // Handle text transform
                    let final_text = el.text;
                    if (el.text_transform === "uppercase") {
                        final_text = el.text.toUpperCase();
                    } else if (el.text_transform === "capitalize") {
                       final_text = el.text.replace(/\b\w/g, l => l.toUpperCase());
                    }

                    return {
                        type: 'text' as const,
                        text: final_text,
                        x: absX,
                        y: el.y * logicalHeight,
                        width: Math.max(width, 100), // minimal 100px
                        fontSize: el.font_size,
                        fontFamily: el.font_family,
                        fontWeight: (el.font_weight >= 700 ? 'bold' : 'normal') as 'bold' | 'normal',
                        fill: el.color,
                        align: (['left', 'center', 'right'].includes(el.align) ? el.align : 'center') as 'left' | 'center' | 'right',
                        rotation: el.rotation || 0,
                        opacity: el.opacity ?? 1.0,
                        letterSpacing: (el.letter_spacing || 0) * el.font_size,
                        lineHeight: el.line_height || 1.2,
                        shadowColor,
                        shadowBlur,
                        shadowOffsetX,
                        shadowOffsetY,
                        backgroundColor: el.background_color,
                        padding: el.background_padding,
                        cornerRadius: el.background_radius,
                        label: `Magic Text ${idx + 1}`,
                    };
                });

                // 5. Batch tambahkan ke canvas via satu history entry
                // Set highlight agar user notice
                if (mode === 'append') {
                    appendMagicTextElements(newNodes);
                } else {
                    addMagicTextElements(newNodes);
                }
                setText('');
            } else {
                throw new Error("AI tidak mengembalikan struktur teks yang valid.");
            }
        } catch (err: unknown) {
            console.error('Magic text error:', err);
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengeksekusi Magic Text.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-4">
            <div className="flex items-center gap-2 border-b pb-4">
                <Wand2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">Magic Text Layouting</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4">
                {/* Textarea Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teks Promosi</label>
                        <span className="text-[11px] text-muted-foreground">{text.length}/500</span>
                    </div>
                    <Textarea
                        placeholder="Contoh: Diskon 50% Khusus Hari Ini! Dapatkan sekarang sebelum kehabisan."
                        className="min-h-[80px] max-h-[240px] resize-y text-sm focus-visible:ring-primary/50"
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 500))}
                        disabled={isGenerating}
                    />
                </div>

                {/* Style Presets Section */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gaya Visual</label>
                    <div className="grid grid-cols-3 gap-2">
                        {STYLE_PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = styleHint === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => setStyleHint(preset.id)}
                                    disabled={isGenerating}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border bg-card text-center transition-all",
                                        "hover:border-primary/50 hover:bg-muted/50",
                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border",
                                        isGenerating && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4 mb-1.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                                    <span className={cn("text-[11px] font-medium block w-full truncate", isSelected ? "text-foreground" : "text-muted-foreground")}>{preset.label}</span>
                                    <span className="text-[11px] text-muted-foreground/70 hidden sm:block truncate w-full">{preset.description}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Mode Append vs Replace */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode Penempatan</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setMode('replace')}
                            disabled={isGenerating}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                                mode === 'replace' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50",
                                isGenerating && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <span className={cn("text-[11px] font-medium mb-1", mode === 'replace' ? "text-foreground" : "text-muted-foreground")}>Ganti Lama</span>
                            <span className="text-[11px] text-muted-foreground/80">Hapus teks lama, ganti baru</span>
                        </button>
                        <button
                            onClick={() => setMode('append')}
                            disabled={isGenerating}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                                mode === 'append' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50",
                                isGenerating && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <span className={cn("text-[11px] font-medium mb-1", mode === 'append' ? "text-foreground" : "text-muted-foreground")}>Tambahkan</span>
                            <span className="text-[11px] text-muted-foreground/80">Tambah teks tanpa menghapus</span>
                        </button>
                    </div>
                </div>

                {warning && !error && (
                    <div className="text-xs text-yellow-600 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{warning}</span>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t mt-auto">
                <Button
                    className="w-full gap-2 relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-[0_4px_14px_rgba(99,102,241,0.4)] border-0"
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim()}
                >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            AI Sedang Berpikir...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Tata Letak Otomatis
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

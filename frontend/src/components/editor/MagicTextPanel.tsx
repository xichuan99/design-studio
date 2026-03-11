"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Wand2, AlertTriangle } from 'lucide-react';
import WebFont from 'webfontloader';

export const MagicTextPanel: React.FC = () => {
    const { stageRef, addMagicTextElements, backgroundUrl, elements } = useCanvasStore();
    const { generateMagicTextLayout } = useProjectApi();

    const [text, setText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        
        if (!backgroundUrl && elements.length === 0) {
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

                    return {
                        type: 'text' as const,
                        text: el.text,
                        x: absX,
                        y: el.y * logicalHeight,
                        width: Math.max(width, 100), // minimal 100px
                        fontSize: el.font_size,
                        fontFamily: el.font_family,
                        fontWeight: (el.font_weight >= 700 ? 'bold' : 'normal') as 'bold' | 'normal',
                        fill: el.color,
                        align: (['left', 'center', 'right'].includes(el.align) ? el.align : 'center') as 'left' | 'center' | 'right',
                        rotation: 0,
                        label: `Magic Text ${idx + 1}`,
                    };
                });

                // 5. Batch tambahkan ke canvas via satu history entry
                // Set highlight agar user notice
                addMagicTextElements(newNodes);
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Masukkan Text/Copy</label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Ketikkan tulisan untuk desain Anda (mis. &quot;Diskon 50% Khusus Hari Ini&quot;). 
                        AI akan membaca tata letak *canvas* saat ini dan meletakkan teks 
                        dengan ukuran, font, dan warna yang pas di area yang kosong.
                    </p>
                    <Textarea
                        placeholder="Ketik teks promo / headline Anda di sini..."
                        className="h-32 resize-none text-sm"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={isGenerating}
                    />
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
                    className="w-full gap-2 relative overflow-hidden group"
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

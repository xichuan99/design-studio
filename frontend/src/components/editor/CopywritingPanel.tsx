"use client";

import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Type, Wand2, Plus, LayoutList } from 'lucide-react';
import { CopywritingVariation } from '@/lib/api';

export const CopywritingPanel: React.FC = () => {
    const { addElement, elements, canvasWidth, canvasHeight } = useCanvasStore();
    const [variations, setVariations] = useState<CopywritingVariation[]>([]);

    useEffect(() => {
        // Load from localStorage on mount
        try {
            const saved = localStorage.getItem('designStudio_copyVariations');
            if (saved) {
                setTimeout(() => setVariations(JSON.parse(saved)), 0);
            }
        } catch (e) {
            console.error("Failed to parse copy variations from localStorage", e);
        }
    }, []);

    const getSmartPosition = (offsetY: number = 0) => {
        const baseX = canvasWidth ? canvasWidth / 2 - 200 : 200;
        const baseY = canvasHeight ? canvasHeight / 2 - 100 : 200;
        const offset = (elements.length % 5) * 20; // stagger
        return { x: baseX + offset, y: baseY + offset + offsetY };
    };

    const handleAddText = (text: string, type: 'headline' | 'subline' | 'cta') => {
        if (!text) return;

        let fontSize = 32;
        let fontWeight: 'normal' | 'bold' = 'normal';
        let yOffset = 0;

        switch (type) {
            case 'headline':
                fontSize = 54;
                fontWeight = 'bold';
                yOffset = 0;
                break;
            case 'subline':
                fontSize = 24;
                fontWeight = 'normal';
                yOffset = 70;
                break;
            case 'cta':
                fontSize = 18;
                fontWeight = 'bold';
                yOffset = 120;
                break;
        }

        const pos = getSmartPosition(yOffset);

        addElement({
            type: 'text',
            x: pos.x,
            y: pos.y,
            width: 400,
            text: text,
            fontSize: fontSize,
            fontFamily: 'Inter',
            fontWeight: fontWeight,
            fill: type === 'cta' ? '#ffffff' : '#0f172a',
            backgroundColor: type === 'cta' ? '#0f172a' : undefined,
            padding: type === 'cta' ? 12 : undefined,
            cornerRadius: type === 'cta' ? 8 : undefined,
            align: 'center',
            rotation: 0,
        });
    };

    const handleAddAll = (v: CopywritingVariation) => {
        if (v.headline) handleAddText(v.headline, 'headline');
        if (v.subline) handleAddText(v.subline, 'subline');
        if (v.cta) handleAddText(v.cta, 'cta');
    };

    if (variations.length === 0) {
        return (
            <div className="flex flex-col h-full bg-card p-4 gap-4">
                <div className="flex items-center gap-2 border-b pb-4">
                    <Type className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-sm">Teks AI</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-70">
                    <LayoutList className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Belum ada teks tersimpan</p>
                    <p className="text-xs text-muted-foreground">
                        Variasi teks akan muncul di sini jika Kamu membuat desain dari teks (Buat dari Teks).
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-4">
            <div className="flex items-center gap-2 border-b pb-4">
                <Type className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">Teks AI (Dari Draft)</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Pilih teks promosi yang disiapkan AI sebelumnya untuk ditambahkan ke kanvas.
                </p>

                {variations.map((v, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-muted text-muted-foreground">
                                <Wand2 className="w-2.5 h-2.5" />
                                {v.style}
                            </span>
                        </div>

                        {/* Headline */}
                        <div className="space-y-1.5 group">
                            <h5 className="font-bold text-sm text-foreground leading-snug">{v.headline}</h5>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity w-full sm:w-auto"
                                onClick={() => handleAddText(v.headline, 'headline')}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Tambah Headline
                            </Button>
                        </div>

                        {/* Subline */}
                        <div className="space-y-1.5 group border-t border-border/50 pt-2">
                            <p className="text-xs text-muted-foreground leading-relaxed">{v.subline}</p>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity w-full sm:w-auto"
                                onClick={() => handleAddText(v.subline, 'subline')}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Tambah Subline
                            </Button>
                        </div>

                        {/* CTA */}
                        <div className="space-y-1.5 group border-t border-border/50 pt-2 bg-muted/20 -mx-4 px-4 pb-2 rounded-b-xl border-x-0 border-b-0">
                            <span className="text-[11px] font-bold text-primary block mt-2">{v.cta}</span>
                            <div className="flex items-center gap-2 justify-between">
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex-1"
                                    onClick={() => handleAddText(v.cta, 'cta')}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Tambah CTA
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="h-6 text-[10px] flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                    onClick={() => handleAddAll(v)}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Tambah Semua
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

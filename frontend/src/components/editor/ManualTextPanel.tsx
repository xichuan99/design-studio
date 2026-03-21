"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useBrandKit } from '@/hooks/useBrandKit';
import { Button } from '@/components/ui/button';
import { Type, Heading1, Heading2, AlignLeft, Sparkles, Palette } from 'lucide-react';
import WebFont from 'webfontloader';
import { Badge } from '@/components/ui/badge';

export const ManualTextPanel: React.FC = () => {
    const { addElement, elements, canvasWidth, canvasHeight } = useCanvasStore();
    const { activeBrandProfile } = useBrandKit();

    const getSmartPosition = () => {
        const baseX = canvasWidth ? canvasWidth / 2 - 100 : 300;
        const baseY = canvasHeight ? canvasHeight / 2 - 50 : 300;
        const offset = (elements.length % 5) * 30; // stagger
        return { x: baseX + offset, y: baseY + offset };
    };

    const loadFont = (fontFamily: string) => {
        if (!fontFamily || fontFamily === 'Inter') return;
        WebFont.load({
            google: {
                families: [`${fontFamily}:400,600,700,900`]
            }
        });
    };



    const handleAddBrandText = (type: 'h1' | 'h2' | 'body' | 'caption') => {
        const hierarchy = activeBrandProfile?.typography?.hierarchy;
        const primaryFont = activeBrandProfile?.typography?.primaryFont || 'Inter';
        const secondaryFont = activeBrandProfile?.typography?.secondaryFont || 'Inter';
        
        let fontFamily = primaryFont;
        let fontSize = 64;
        let fontWeight: 'bold' | 'normal' = 'bold';
        let text = 'Tambahkan Judul';
        let letterSpacing = 0;

        if (type === 'h1') {
            fontFamily = primaryFont;
            text = 'Tambahkan Judul Besar';
            if (hierarchy?.h1) {
                fontSize = parseInt(hierarchy.h1.size) || 64;
                fontWeight = parseInt(hierarchy.h1.weight) >= 600 ? 'bold' : 'normal';
                if (hierarchy.h1.letterSpacing && hierarchy.h1.letterSpacing.includes('em')) {
                    letterSpacing = parseFloat(hierarchy.h1.letterSpacing) * fontSize;
                }
            }
        } else if (type === 'h2') {
            fontFamily = primaryFont;
            fontSize = 40;
            text = 'Tambahkan Subjudul';
            if (hierarchy?.h2) {
                fontSize = parseInt(hierarchy.h2.size) || 40;
                fontWeight = parseInt(hierarchy.h2.weight) >= 600 ? 'bold' : 'normal';
                if (hierarchy.h2.letterSpacing && hierarchy.h2.letterSpacing.includes('em')) {
                    letterSpacing = parseFloat(hierarchy.h2.letterSpacing) * fontSize;
                }
            }
        } else if (type === 'body') {
            fontFamily = secondaryFont;
            fontSize = 18;
            fontWeight = 'normal';
            text = 'Tambahkan teks isi atau paragraf pendek di sini.';
            if (hierarchy?.body) {
                fontSize = parseInt(hierarchy.body.size) || 16;
                fontWeight = parseInt(hierarchy.body.weight) >= 600 ? 'bold' : 'normal';
                if (hierarchy.body.letterSpacing && hierarchy.body.letterSpacing.includes('em')) {
                    letterSpacing = parseFloat(hierarchy.body.letterSpacing) * fontSize;
                }
            }
        } else if (type === 'caption') {
            fontFamily = secondaryFont;
            fontSize = 14;
            fontWeight = 'normal';
            text = 'Teks caption kecil';
            if (hierarchy?.caption) {
                fontSize = parseInt(hierarchy.caption.size) || 12;
                fontWeight = parseInt(hierarchy.caption.weight) >= 600 ? 'bold' : 'normal';
                if (hierarchy.caption.letterSpacing && hierarchy.caption.letterSpacing.includes('em')) {
                    letterSpacing = parseFloat(hierarchy.caption.letterSpacing) * fontSize;
                }
            }
        }

        loadFont(fontFamily);

        const pos = getSmartPosition();
        addElement({
            type: 'text',
            x: pos.x,
            y: pos.y,
            text,
            fontSize,
            fontFamily,
            fontWeight: fontWeight as 'bold' | 'normal',
            fill: activeBrandProfile?.colors?.[0]?.hex || '#0f172a',
            letterSpacing,
            rotation: 0,
        });
    };

    return (
        <div className="flex flex-col h-full bg-card p-4 gap-6 overflow-y-auto">
            <div className="flex items-center gap-2 border-b pb-4">
                <Type className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-sm">Tambahkan Teks</h2>
            </div>

            {/* Default Styles */}
            <div className="space-y-3">
                <Button 
                    variant="outline" 
                    className="w-full justify-start h-12 rounded-xl text-base shadow-sm bg-background border-border"
                    onClick={() => handleAddBrandText('h1')}
                >
                    <Heading1 className="h-5 w-5 mr-3 text-muted-foreground" />
                    Tambahkan Judul
                </Button>
                
                <Button 
                    variant="outline" 
                    className="w-full justify-start h-10 rounded-lg shadow-sm bg-background border-border"
                    onClick={() => handleAddBrandText('h2')}
                >
                    <Heading2 className="h-4 w-4 mr-3 text-muted-foreground" />
                    Tambahkan Subjudul
                </Button>
                
                <Button 
                    variant="ghost" 
                    className="w-full justify-start h-8 rounded-md text-sm bg-muted/50 text-muted-foreground"
                    onClick={() => handleAddBrandText('body')}
                >
                    <AlignLeft className="h-3.5 w-3.5 mr-3" />
                    Tambahkan teks isi
                </Button>
            </div>

            {/* Brand Kit Integration */}
            {activeBrandProfile ? (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Brand Kit Font</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-background">Aktif</Badge>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Primary (Judul)</span>
                            <span className="font-semibold bg-primary/10 px-2 py-0.5 rounded text-primary">{activeBrandProfile.typography?.primaryFont || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Secondary (Isi)</span>
                            <span className="font-semibold bg-primary/10 px-2 py-0.5 rounded text-primary">{activeBrandProfile.typography?.secondaryFont || '-'}</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-primary/10">
                        {activeBrandProfile.brand_strategy?.differentiator || "Teks baru akan mengikuti font Style Brand Kit Anda secara otomatis."}
                    </p>
                </div>
            ) : (
                <div className="p-4 rounded-xl border border-dashed bg-muted/20 space-y-2 text-center">
                    <Palette className="w-5 h-5 mx-auto text-muted-foreground opacity-50 mb-1" />
                    <p className="text-xs text-muted-foreground">Aktifkan Brand Kit untuk menerapkan font brand Anda secara otomatis.</p>
                </div>
            )}
        </div>
    );
};

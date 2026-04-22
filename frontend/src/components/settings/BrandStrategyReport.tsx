import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandKitProfile } from '@/lib/api';
import { Sparkles, Palette, Type, Target, Save, Edit3, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BrandStrategyReportProps {
    brandData: Partial<BrandKitProfile>;
    onSave: () => void;
    onEdit: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export default function BrandStrategyReport({ brandData, onSave, onEdit, onCancel, isSaving }: BrandStrategyReportProps) {
    if (!brandData) return null;

    const { colors, typography, brand_strategy, name, logo_url } = brandData;

    return (
        <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
            {/* Header Area */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border-b border-primary/10">
                <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                        {logo_url ? (
                            <div className="w-24 h-24 rounded-xl shadow-md border bg-white flex items-center justify-center p-2 hidden sm:flex">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-xl shadow-md border bg-muted flex flex-col items-center justify-center p-2 hidden sm:flex">
                                <Sparkles className="w-8 h-8 text-primary/50 mb-2" />
                            </div>
                        )}
                        <div>
                            <Badge className="mb-2 bg-primary/20 text-primary hover:bg-primary/20 border-0">Brand Identity Draft dari AI</Badge>
                            <h2 className="text-3xl font-bold mb-1 tracking-tight">{name || 'Unnamed Brand'}</h2>
                            {brand_strategy?.differentiator && (
                                <p className="text-muted-foreground text-sm max-w-md italic">&quot;{brand_strategy.differentiator}&quot;</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                    {/* Left Column - Strategy & Typography */}
                    <div className="md:col-span-2 p-8 border-r border-border/40 space-y-10">
                        {/* Strategy Section */}
                        {brand_strategy && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Target className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xl font-semibold">Arah Brand</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted/30 p-4 rounded-xl border">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Target Audience</p>
                                        <p className="text-sm">{brand_strategy.targetAudience || '-'}</p>
                                    </div>
                                    <div className="bg-muted/30 p-4 rounded-xl border">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Design Style</p>
                                        <p className="text-sm">{brand_strategy.designStyle || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Personality Traits</p>
                                    <div className="flex flex-wrap gap-2">
                                        {brand_strategy.personality?.map(p => (
                                            <Badge key={p} variant="secondary" className="font-normal">{p}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Typography Section */}
                        {typography && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
                                        <Type className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xl font-semibold">Sistem Tipografi</h3>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="border rounded-xl p-5 bg-card relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <span className="text-6xl font-serif">Aa</span>
                                        </div>
                                        <div className="relative z-10 w-3/4">
                                            <Badge variant="outline" className="mb-2 text-xs">Primary: {typography.primaryFont}</Badge>
                                            <h4 className="text-3xl mb-2" style={{ fontFamily: typography.primaryFont }}>The quick brown fox jumps over the lazy dog</h4>
                                            {typography.primaryFontReasoning && (
                                                <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t pt-3">
                                                    {typography.primaryFontReasoning}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border rounded-xl p-5 bg-muted/20 relative overflow-hidden">
                                         <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <span className="text-6xl font-sans">Aa</span>
                                        </div>
                                        <div className="relative z-10 w-3/4">
                                            <Badge variant="outline" className="mb-2 text-xs">Secondary: {typography.secondaryFont}</Badge>
                                            <p className="text-base" style={{ fontFamily: typography.secondaryFont }}>The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow.</p>
                                            {typography.secondaryFontReasoning && (
                                                <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t pt-3 border-border/50">
                                                    {typography.secondaryFontReasoning}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {typography.hierarchy && (
                                        <div className="bg-muted/10 p-5 rounded-xl border border-dashed">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">CSS Hierarchy Reference</p>
                                            <div className="space-y-3">
                                                {Object.entries(typography.hierarchy).map(([level, styles]) => (
                                                    <div key={level} className="flex justify-between items-end border-b pb-2 last:border-0 last:pb-0">
                                                        <span className="font-mono text-xs text-muted-foreground w-16 uppercase">{level}</span>
                                                        <span className="text-sm truncate max-w-[200px]" style={{
                                                            fontSize: styles.size || 'inherit',
                                                            fontWeight: styles.weight || 'inherit'
                                                        }}>System Scale</span>
                                                        <span className="font-mono text-xs hidden sm:block">
                                                            S: {styles.size} | W: {styles.weight} | LS: {styles.letterSpacing}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Column - Color Palette */}
                    <div className="p-8 bg-muted/10 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <Palette className="w-4 h-4" />
                            </div>
                            <h3 className="text-xl font-semibold">Palet Warna</h3>
                        </div>
                        
                        <div className="space-y-4">
                            {colors?.map((color, index) => (
                                <div key={index} className="group relative">
                                    <div 
                                        className="h-24 w-full rounded-xl shadow-sm border mb-3 relative overflow-hidden transition-transform group-hover:scale-[1.02]" 
                                        style={{ backgroundColor: color.hex }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="absolute bottom-2 left-3 text-white text-sm font-mono opacity-0 group-hover:opacity-100 tracking-wider">
                                            {color.hex.toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="font-medium capitalize">{color.name}</h4>
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-mono">{color.role}</Badge>
                                        </div>
                                        {color.reasoning && (
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {color.reasoning}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
            
            <div className="bg-muted/30 p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button variant="ghost" className="text-muted-foreground" onClick={onCancel}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Batal & Kembali
                </Button>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={onEdit}>
                        <Edit3 className="w-4 h-4 mr-2" /> Edit Manual
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={onSave} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" /> 
                        {isSaving ? "Menyimpan..." : "Simpan Brand Kit"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

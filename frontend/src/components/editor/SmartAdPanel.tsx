"use client";

import React, { useState } from 'react';
import { useAdCreatorEndpoints } from '@/lib/api/adCreatorApi';
import { AdCreatorResponse } from '@/lib/api/types';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useBrandKit } from '@/hooks/useBrandKit';
import { Upload, AlertCircle, Loader2, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export const SmartAdPanel: React.FC = () => {
    const { activeBrandProfile } = useBrandKit();
    const { generateSmartAd } = useAdCreatorEndpoints();
    const setBackgroundUrl = useCanvasStore((state) => state.setBackgroundUrl);
    const addElement = useCanvasStore((state) => state.addElement);

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [brief, setBrief] = useState('');
    const [shouldUseBrandKit, setShouldUseBrandKit] = useState(false);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<AdCreatorResponse | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!imagePreview) {
            toast.error("Upload foto produk terlebih dahulu");
            return;
        }

        setIsGenerating(true);
        setResult(null);

        try {
            const payload = {
                image_base64: imagePreview,
                brief: brief || undefined,
                brand_kit_id: shouldUseBrandKit && activeBrandProfile ? activeBrandProfile.id : undefined
            };

            const response = await generateSmartAd(payload);
            setResult(response);
            toast.success("Berhasil! 3 variasi konsep telah dibuat.");
        } catch (error: unknown) {
            const err = error as Error;
            toast.error(err.message || "Gagal menghasilkan iklan.");
        } finally {
            setIsGenerating(false);
        }
    };

    const applyConceptToCanvas = (concept: AdCreatorResponse['concepts'][0]) => {
        if (!result) return;
        
        // 1. Set Background
        setBackgroundUrl(concept.image_url);

        // 2. Add Foreground Product
        addElement({
            type: 'image',
            url: result.foreground_url,
            x: 340,
            y: 340,
            width: 400,
            height: 400,
            rotation: 0
        });

        // 3. Add Texts (Basic layout, user can adjust)
        addElement({
            type: 'text',
            text: concept.headline.toUpperCase(),
            fontSize: 48,
            fontWeight: "bold",
            fill: "#FFFFFF",
            fontFamily: "Inter",
            x: 100,
            y: 100,
            rotation: 0
        });

        addElement({
            type: 'text',
            text: concept.tagline,
            fontSize: 24,
            fontWeight: "normal",
            fill: "#FFFFFF",
            fontFamily: "Inter",
            x: 100,
            y: 180,
            rotation: 0
        });

        toast.success(`Konsep ${concept.concept_name} diterapkan ke canvas`);
    };

    return (
        <div className="flex flex-col h-full bg-card p-4 overflow-y-auto custom-scrollbar">
            
            {!result ? (
                <div className="space-y-6">
                    {/* Upload Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">1. Foto Produk</label>
                        <div 
                            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors relative"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('ad-image-upload')?.click()}
                        >
                            <input 
                                id="ad-image-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageChange}
                            />
                            {imagePreview ? (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden flex items-center justify-center bg-black/5 border border-muted-foreground/10">
                                    <Image src={imagePreview} alt="Preview" fill className="object-contain" unoptimized />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white text-sm font-medium z-10">
                                        Klik untuk ganti foto
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                        <Upload className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">Upload atau drop foto</p>
                                    <p className="text-xs text-muted-foreground mt-1">Gunakan foto produk yang jelas</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Brief Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">2. Brief Iklan (Opsional)</label>
                        <textarea
                            value={brief}
                            onChange={(e) => setBrief(e.target.value)}
                            placeholder="Contoh: Promo akhir tahun diskon 30%, target ibu muda..."
                            className="w-full h-20 px-3 py-2 text-sm bg-background border border-border rounded-lg placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                    </div>

                    {/* Brand Kit Opt-in */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground flex items-center gap-2">
                            3. Brand Identity
                            {activeBrandProfile && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">Tersedia</span>}
                        </label>
                        
                        <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="brandStrategy" 
                                    className="mt-1"
                                    checked={!shouldUseBrandKit}
                                    onChange={() => setShouldUseBrandKit(false)}
                                />
                                <div>
                                    <p className="text-sm font-medium">Creative Freedom</p>
                                    <p className="text-xs text-muted-foreground">AI bebas memilih warna dan gaya visual terbaik.</p>
                                </div>
                            </label>
                            
                            <label className={`flex items-start gap-3 cursor-pointer ${!activeBrandProfile ? 'opacity-50' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="brandStrategy" 
                                    className="mt-1"
                                    checked={shouldUseBrandKit}
                                    onChange={() => activeBrandProfile && setShouldUseBrandKit(true)}
                                    disabled={!activeBrandProfile}
                                />
                                <div>
                                    <p className="text-sm font-medium">Gunakan Brand Kit</p>
                                    <p className="text-xs text-muted-foreground">
                                        {activeBrandProfile ? `Terapkan warna dan identitas ${activeBrandProfile.name}` : 'Buat Brand Kit di pengaturan terlebih dahulu'}
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!imagePreview || isGenerating}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sedang Memproses...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4 fill-current" />
                                Generate 3 Variasi (-5 Kredit)
                            </>
                        )}
                    </button>
                    
                    <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-blue-500">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed">
                            Akan memotong background secara otomatis dan membuat teks copy iklan. Proses memakan waktu ~15-30 detik.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between pb-2 border-b">
                        <h3 className="text-sm font-semibold">Hasil Generate</h3>
                        <button 
                            onClick={() => setResult(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Buat Baru
                        </button>
                    </div>
                    
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-1 md:overflow-visible custom-scrollbar">
                        {result.concepts.map((concept: AdCreatorResponse['concepts'][0], index: number) => (
                            <div key={concept.id} className="relative group rounded-xl overflow-hidden border border-border bg-background min-w-[85%] md:min-w-0 snap-center shrink-0">
                                <div className="relative aspect-video w-full bg-muted">
                                    {/* Mock composite preview */}
                                    <Image src={concept.image_url} alt="Background" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" unoptimized={concept.image_url.startsWith('http')} />
                                    <div className="absolute inset-0 p-4 drop-shadow-2xl">
                                        <Image src={result.foreground_url} alt="Product" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain" unoptimized={result.foreground_url.startsWith('http')} />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                                    
                                    <div className="absolute bottom-3 left-3 right-3 text-white">
                                        <p className="text-sm font-bold leading-tight">{concept.headline}</p>
                                        <p className="text-[10px] opacity-80 line-clamp-1">{concept.tagline}</p>
                                    </div>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <button 
                                            onClick={() => applyConceptToCanvas(concept)}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2"
                                        >
                                            <Check className="w-4 h-4" />
                                            Pakai Konsep {index + 1}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2.5 text-xs bg-muted/30">
                                    <p className="font-medium text-foreground">{concept.concept_name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

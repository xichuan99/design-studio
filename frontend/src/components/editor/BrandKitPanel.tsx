import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Save, Palette, CheckCircle2 } from 'lucide-react';
import { useProjectApi, ColorSwatch, BrandKit } from '@/lib/api';
import Image from 'next/image';

interface BrandKitPanelProps {
    onClose: () => void;
    // We pass generic apply colors upwards if needed, 
    // or let the panel just manage the DB and the global store handles the active kit
    onApplyColors?: (colors: string[]) => void; 
}

export default function BrandKitPanel({ onClose, onApplyColors }: BrandKitPanelProps) {
    const api = useProjectApi();
    const apiRef = useRef(api);
    apiRef.current = api;

    const [kits, setKits] = useState<BrandKit[]>([]);
    const [activeKitId, setActiveKitId] = useState<string | null>(null);
    const [isLoadingKits, setIsLoadingKits] = useState(true);

    // Extraction state
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedColors, setExtractedColors] = useState<ColorSwatch[] | null>(null);
    const [extractedLogoUrl, setExtractedLogoUrl] = useState<string | null>(null);
    const [newKitName, setNewKitName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [error, setError] = useState<string | null>(null);

    // Initial load    
    const loadKits = React.useCallback(async () => {
        try {
            setIsLoadingKits(true);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Request timeout")), 10000)
            );

            const [allKits, active] = await Promise.race([
                Promise.all([
                    apiRef.current.getBrandKits(),
                    apiRef.current.getActiveBrandKit()
                ]),
                timeoutPromise as Promise<[BrandKit[], BrandKit | null]>
            ]);
            
            setKits(allKits);
            if (active) setActiveKitId(active.id);
        } catch (err: unknown) {
            console.error(err);
            setIsLoadingKits(false);
        } finally {
            setIsLoadingKits(false);
        }
    }, []);

    useEffect(() => {
        loadKits();
    }, [loadKits]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsExtracting(true);
            setError(null);
            
            // For the preview, we can use object URL
            const previewUrl = URL.createObjectURL(file);
            setExtractedLogoUrl(previewUrl);

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Ekstraksi warna terlalu lama (Request timeout)")), 15000)
            );

            const result = await Promise.race([
                api.extractBrandColors(file),
                timeoutPromise as Promise<{ colors: ColorSwatch[] }>
            ]);
            
            setExtractedColors(result.colors);
            setNewKitName(''); // Reset name field

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to extract colors');
            }
            setExtractedColors(null);
            setExtractedLogoUrl(null);
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveKit = async () => {
        if (!extractedColors) return;
        
        // In a full implementation, we'd also upload the logo to a storage bucket here
        // and get the actual URL. For now, we simulate saving without a real logo URL 
        // if we didn't implement the generic storage upload yet.
        
        try {
            setIsSaving(true);
            setError(null);
            // Default name if empty
            const kitName = newKitName.trim() || 'My Brand Kit';
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Gagal menyimpan (Request timeout)")), 10000)
            );

            await Promise.race([
                api.saveBrandKit({
                    name: kitName,
                    colors: extractedColors,
                    logo_url: null // We skip logo_url for now unless we upload it to s3/supabase
                }),
                timeoutPromise
            ]);
            
            // Reload list
            await loadKits();
            
            // Clear extraction state
            setExtractedColors(null);
            setExtractedLogoUrl(null);
            setNewKitName('');
            
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to save Brand Kit');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetActive = async (id: string) => {
        try {
            await api.updateBrandKit(id, { is_active: true });
            setActiveKitId(id);
            // Re-fetch to ensure sync
            await loadKits();
        } catch (err) {
            console.error('Failed to set active kit', err);
        }
    };

    const handleApplyActiveToCanvas = () => {
        if (!activeKitId || !onApplyColors) return;
        const activeKit = kits.find(k => k.id === activeKitId);
        if (activeKit) {
            const hexes = activeKit.colors.map(c => c.hex);
            onApplyColors(hexes);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card gap-4">
            <div className="flex items-center justify-between border-b pb-4 px-4 pt-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-sm">Brand Kit</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 px-4 pb-4">
                
                {/* Intro/Upload Area */}
                {!extractedColors && (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-muted-foreground">
                            Upload logo untuk otomatis mengekstrak warna brand dan menggunakannya pada desain AI.
                        </p>
                        
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExtracting}
                            className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-card hover:bg-muted/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExtracting ? (
                                <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                            )}
                            <span className="text-xs font-medium text-foreground">
                                {isExtracting ? 'Menganalisa warna logo...' : 'Upload Logo'}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1">PNG, JPG up to 5MB</span>
                        </button>

                        {error && (
                            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 mt-2">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Extraction Results & Save Form */}
                {extractedColors && (
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm text-foreground">Warna Tengekstrak</h4>
                            <button 
                                onClick={() => {
                                    setExtractedColors(null);
                                    setExtractedLogoUrl(null);
                                    setError(null);
                                }}
                                className="text-[10px] text-muted-foreground hover:text-foreground underline"
                            >
                                Batal
                            </button>
                        </div>
                        
                        {extractedLogoUrl && (
                            <div className="w-16 h-16 relative bg-white rounded-lg border border-border overflow-hidden mx-auto mb-2">
                                <Image src={extractedLogoUrl} alt="Logo preview" fill className="object-contain p-1" />
                            </div>
                        )}

                        <div className="flex justify-center gap-3">
                            {extractedColors.map((color, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1 group relative">
                                    <div 
                                        className="w-8 h-8 rounded-full border border-border/50 shadow-sm"
                                        style={{ backgroundColor: color.hex }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute top-10 whitespace-nowrap bg-secondary text-secondary-foreground text-[10px] py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                        {color.name}<br/>{color.hex}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nama Brand Kit</label>
                            <input 
                                type="text" 
                                placeholder="E.g., Brand Utama" 
                                value={newKitName}
                                onChange={(e) => setNewKitName(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <button
                            onClick={handleSaveKit}
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium h-9 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-2"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Simpan Brand Kit
                        </button>
                        
                        {error && <span className="text-xs text-destructive">{error}</span>}
                    </div>
                )}

                {/* Saved Kits List */}
                <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Brand Kit Tersimpan</h4>
                    
                    {isLoadingKits ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /></div>
                    ) : kits.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center p-4 bg-muted/50 rounded-xl border border-dashed border-border/50">
                            Belum ada brand kit yang disimpan.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {kits.map(kit => {
                                const isActive = kit.id === activeKitId;
                                return (
                                    <div 
                                        key={kit.id} 
                                        className={`p-3 rounded-xl border ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'} transition-all flex flex-col gap-3`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                                {kit.name}
                                                {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                            </span>
                                            {!isActive && (
                                                <button 
                                                    onClick={() => handleSetActive(kit.id)}
                                                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium"
                                                >
                                                    Set Aktif
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {kit.colors.map((c, i) => (
                                                <div 
                                                    key={i} 
                                                    className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                                                    style={{ backgroundColor: c.hex }}
                                                    title={`${c.name} (${c.hex})`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
            
            {/* Bottom Apply Action */}
            {onApplyColors && kits.length > 0 && activeKitId && (
                <div className="p-4 border-t border-border bg-card mt-auto shrink-0">
                    <button 
                        onClick={handleApplyActiveToCanvas}
                        className="w-full bg-primary text-primary-foreground font-medium text-xs py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Terapkan ke Canvas
                    </button>
                    <p className="text-[10px] text-muted-foreground text-center mt-2 leading-tight">
                        Mengaplikasikan warna brand aktif ke background. Generate desain AI selanjutnya akan mengikuti warna ini.
                    </p>
                </div>
            )}
        </div>
    );
}

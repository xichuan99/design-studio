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
            const [allKits, active] = await Promise.all([
                api.getBrandKits(),
                api.getActiveBrandKit()
            ]);
            setKits(allKits);
            if (active) setActiveKitId(active.id);
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setIsLoadingKits(false);
        }
    }, [api]);

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

            const result = await api.extractBrandColors(file);
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
            
            await api.saveBrandKit({
                name: kitName,
                colors: extractedColors,
                logo_url: null // We skip logo_url for now unless we upload it to s3/supabase
            });
            
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
        <div className="absolute left-[80px] top-0 bottom-0 w-80 bg-white border-r border-[#e5e7eb] shadow-lg flex flex-col z-20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb]">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-500" />
                    Brand Kit
                </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    aria-label="Close panel"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                
                {/* Intro/Upload Area */}
                {!extractedColors && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-gray-600">
                            Upload your logo to automatically extract brand colors and apply them consistently across all AI generations.
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
                            className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-indigo-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExtracting ? (
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                                {isExtracting ? 'Analyzing logo colors...' : 'Upload Logo'}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                        </button>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100 mt-2">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Extraction Results & Save Form */}
                {extractedColors && (
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <h4 className="font-medium text-indigo-900">Extracted Colors</h4>
                            <button 
                                onClick={() => {
                                    setExtractedColors(null);
                                    setExtractedLogoUrl(null);
                                    setError(null);
                                }}
                                className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        {extractedLogoUrl && (
                            <div className="w-16 h-16 relative bg-white rounded-md border border-gray-200 overflow-hidden mx-auto mb-2">
                                <Image src={extractedLogoUrl} alt="Logo preview" fill className="object-contain p-1" />
                            </div>
                        )}

                        <div className="flex justify-center gap-3">
                            {extractedColors.map((color, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1 group relative">
                                    <div 
                                        className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                                        style={{ backgroundColor: color.hex }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute top-10 whitespace-nowrap bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                        {color.name}<br/>{color.hex}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-sm font-medium text-gray-700">Kit Name</label>
                            <input 
                                type="text" 
                                placeholder="E.g., Brand Utama" 
                                value={newKitName}
                                onChange={(e) => setNewKitName(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            onClick={handleSaveKit}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium h-9 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Brand Kit
                        </button>
                        
                        {error && <span className="text-xs text-red-600">{error}</span>}
                    </div>
                )}

                {/* Saved Kits List */}
                <div className="flex flex-col gap-3">
                    <h4 className="font-medium text-gray-800 text-sm uppercase tracking-wider">Your Brand Kits</h4>
                    
                    {isLoadingKits ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
                    ) : kits.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No brand kits saved yet.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {kits.map(kit => {
                                const isActive = kit.id === activeKitId;
                                return (
                                    <div 
                                        key={kit.id} 
                                        className={`p-3 rounded-lg border ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'} transition-all flex flex-col gap-3`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-sm text-gray-800 flex items-center gap-1.5">
                                                {kit.name}
                                                {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            </span>
                                            {!isActive && (
                                                <button 
                                                    onClick={() => handleSetActive(kit.id)}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Set Active
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
                <div className="p-4 border-t border-[#e5e7eb] bg-gray-50">
                    <button 
                        onClick={handleApplyActiveToCanvas}
                        className="w-full bg-indigo-600 text-white font-medium text-sm py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Apply Active Colors to Canvas
                    </button>
                    <p className="text-[10px] text-gray-500 text-center mt-2 leading-tight">
                        Applies active brand colors to background or available elements. Generating AI image/text will automatically use these colors.
                    </p>
                </div>
            )}
        </div>
    );
}

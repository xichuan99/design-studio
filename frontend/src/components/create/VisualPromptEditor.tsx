import React, { useState } from "react";
import { Loader2, Undo2, ChevronDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ParsedDesignData, VisualPromptPart } from "@/app/create/types";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";

interface VisualPromptEditorProps {
    parsedData: ParsedDesignData;
    onTogglePromptPart: (index: number) => void;
    onModifyPromptParts: (newParts: VisualPromptPart[], newCombined: string, newTranslation?: string) => void;
    compact?: boolean;
    onGenerate?: () => void;
    isGeneratingImage?: boolean;
}

const SUGGESTIONS = [
    "Buat lebih terang", 
    "Warna lebih hangat", 
    "Lebih dramatis",
    "Gaya minimalis", 
    "Latar belakang polos", 
    "Efek sinematik"
];

const LABEL_ID: Record<string, string> = {
    "Lighting": "Pencahayaan",
    "Color Palette": "Palet Warna",
    "Background": "Latar Belakang",
    "Composition": "Komposisi",
    "Style": "Gaya Visual",
    "Mood": "Suasana",
    "Texture": "Tekstur",
    "Typography": "Tipografi",
    "Subject": "Subjek Utama",
    "Perspective": "Perspektif",
    "Effects": "Efek Visual",
    "Details": "Detail",
    "Layout": "Tata Letak",
    "Foreground": "Latar Depan",
    "Product Placement": "Penempatan Produk",
    "Color Scheme": "Skema Warna",
    "Atmosphere": "Atmosfer",
    "Scene": "Pemandangan",
    "Camera Angle": "Sudut Kamera",
    "Illustration Style": "Gaya Ilustrasi",
};

export function VisualPromptEditor({
    parsedData,
    onTogglePromptPart,
    onModifyPromptParts,
    compact = false,
    onGenerate,
    isGeneratingImage
}: VisualPromptEditorProps) {
    const [instruction, setInstruction] = useState("");
    const [isModifying, setIsModifying] = useState(false);
    
    // Keep track of the initially parsed parts so we can undo
    const [originalParts] = useState<VisualPromptPart[]>(parsedData.visual_prompt_parts || []);
    const [originalCombined] = useState<string>(parsedData.visual_prompt || "");
    const [hasModified, setHasModified] = useState(false);

    const handleApplyModification = async () => {
        if (!instruction.trim()) return;
        
        setIsModifying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/designs/modify-prompt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    original_prompt_parts: parsedData.visual_prompt_parts,
                    original_visual_prompt: originalCombined,
                    user_instruction: instruction
                })
            });

            if (!res.ok) throw new Error("Gagal memodifikasi prompt");
            
            const data = await res.json();
            
            // Merge logic: in case the AI didn't return all parts, we keep the ones that are missing
            const newParts: VisualPromptPart[] = [...(parsedData.visual_prompt_parts || originalParts)];
            const modifiedParts = data.modified_prompt_parts as VisualPromptPart[];
            
            modifiedParts.forEach(modPart => {
                const idx = newParts.findIndex(p => p.category === modPart.category);
                if (idx >= 0) {
                    newParts[idx] = modPart;
                } else {
                    // In case AI added a totally new category
                    newParts.push(modPart);
                }
            });

            onModifyPromptParts(newParts, data.modified_visual_prompt, data.indonesian_translation);
            setHasModified(true);
            setInstruction("");
            toast.success("Perubahan berhasil diterapkan!");
        } catch (error) {
            console.error(error);
            toast.error("Gagal menerapkan perubahan. Silakan coba lagi.");
        } finally {
            setIsModifying(false);
        }
    };

    const handleUndo = () => {
        onModifyPromptParts(originalParts, originalCombined);
        setHasModified(false);
        toast.info("Perubahan dibatalkan");
    };

    return (
        <div className={`flex flex-col w-full mx-auto animation-fade-in gap-5 ${compact ? 'pb-4' : 'max-w-3xl pb-20'}`}>
            

            {/* AI Modification Box - Moved to TOP as requested */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(var(--primary),0.05)] mt-2">
                <div className="mb-3">
                    <h4 className="text-sm font-semibold text-foreground">✏️ Revisi Prompt</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Ingin mengubah hasil gambar? Tulis revisi Anda di bawah, lalu klik Terapkan.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Input 
                            placeholder="Tulis revisi Anda di sini..."
                            className="h-12 bg-background dark:bg-white/5 border-primary/30 focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyModification()}
                            disabled={isModifying}
                        />
                    </div>
                    <Button 
                        onClick={handleApplyModification} 
                        disabled={isModifying || !instruction.trim()}
                        className="h-12 px-6 shadow-md"
                    >
                        {isModifying ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
                        ) : (
                            "Terapkan"
                        )}
                    </Button>
                </div>

                {/* Suggestions */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((sug, i) => (
                        <Badge 
                            key={i} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3 bg-background/50 text-muted-foreground border-border/50 font-normal"
                            onClick={() => {
                                setInstruction(sug);
                            }}
                        >
                            {sug}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Translation Box (Konfirmasi Maksud AI) - Middle */}
            {parsedData.indonesian_translation && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center mt-4">
                    <p className="text-sm font-medium text-primary">Maksud AI saat ini:</p>
                    <p className="text-sm text-muted-foreground mt-1">&quot;{parsedData.indonesian_translation}&quot;</p>
                </div>
            )}

            {/* Generate Ulang - Standalone CTA */}
            {compact && onGenerate && (
                <Button 
                    onClick={onGenerate} 
                    disabled={isGeneratingImage || isModifying} 
                    variant="default"
                    className="w-full mt-4 font-bold shadow-lg h-12 rounded-xl transition-all"
                >
                    {isGeneratingImage ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generate...</> : "🔄 Generate Ulang Gambar"}
                </Button>
            )}

            {/* Prompt Parts Toggles - Wrapped in details for compact mode */}
            {compact ? (
                <details className="group/settings border border-border/50 rounded-xl bg-card overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open/settings:-rotate-180" />
                            <h3 className="font-semibold text-foreground/80 text-sm tracking-wide uppercase">Pengaturan Visual</h3>
                        </div>
                        <div className="text-xs text-muted-foreground/80 font-medium">
                            {parsedData.visual_prompt_parts?.filter(p => p.enabled).length || 0}/{parsedData.visual_prompt_parts?.length || 0} Aktif
                        </div>
                    </summary>
                    <div className="p-4 pt-0 border-t border-border/20 space-y-3">
                        {hasModified && (
                            <div className="flex justify-end mb-2">
                                <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 py-0 px-2 text-muted-foreground hover:text-foreground">
                                    <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Batal Perubahan
                                </Button>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {parsedData.visual_prompt_parts?.map((part, idx) => (
                                <div 
                                    key={idx} 
                                    className={`rounded-xl border transition-all duration-300 p-4 flex flex-col gap-3 group
                                        ${part.enabled 
                                            ? 'bg-card border-border/50 shadow-sm' 
                                            : 'bg-muted/30 opacity-60 hover:opacity-80 border-border/20'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <label 
                                            htmlFor={`switch-${idx}`}
                                            className={`text-sm font-bold tracking-wide cursor-pointer select-none transition-all
                                                ${part.enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            {LABEL_ID[part.label] || part.label}
                                        </label>
                                        <Switch 
                                            checked={part.enabled}
                                            onCheckedChange={() => onTogglePromptPart(idx)}
                                            id={`switch-${idx}`}
                                        />
                                    </div>
                                    
                                    {/* Hide English prompt behind details for clean UI */}
                                    {part.enabled && (
                                        <details className="group/details">
                                            <summary className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 w-fit transition-colors">
                                                <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open/details:rotate-180" />
                                                Lihat English AI Prompt
                                            </summary>
                                            <div className="mt-2 text-xs font-mono text-muted-foreground/80 bg-muted/40 p-2 rounded-md break-words">
                                                {part.value}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {(!parsedData.visual_prompt_parts || parsedData.visual_prompt_parts.length === 0) && (
                            <div className="w-full text-sm rounded-lg p-4 bg-muted/30 border border-border text-muted-foreground">
                                {parsedData.visual_prompt}
                            </div>
                        )}
                    </div>
                </details>
            ) : (
                <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-semibold text-foreground/80 text-sm tracking-wide uppercase">Pengaturan Visual</h3>
                        {hasModified && (
                            <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 text-muted-foreground hover:text-foreground">
                                <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Batal Perubahan
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {parsedData.visual_prompt_parts?.map((part, idx) => (
                            <div 
                                key={idx} 
                                className={`rounded-xl border transition-all duration-300 p-4 flex flex-col gap-3 group
                                    ${part.enabled 
                                        ? 'bg-card border-border/50 shadow-sm' 
                                        : 'bg-muted/30 opacity-60 hover:opacity-80 border-border/20'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <label 
                                        htmlFor={`switch-${idx}`}
                                        className={`text-sm font-bold tracking-wide cursor-pointer select-none transition-all
                                            ${part.enabled ? 'text-foreground' : 'text-muted-foreground'}`}
                                    >
                                        {LABEL_ID[part.label] || part.label}
                                    </label>
                                    <Switch 
                                        checked={part.enabled}
                                        onCheckedChange={() => onTogglePromptPart(idx)}
                                        id={`switch-${idx}`}
                                    />
                                </div>
                                
                                {/* Hide English prompt behind details for clean UI */}
                                {part.enabled && (
                                    <details className="group/details">
                                        <summary className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 w-fit transition-colors">
                                            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open/details:rotate-180" />
                                            Lihat English AI Prompt
                                        </summary>
                                        <div className="mt-2 text-xs font-mono text-muted-foreground/80 bg-muted/40 p-2 rounded-md break-words">
                                            {part.value}
                                        </div>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {(!parsedData.visual_prompt_parts || parsedData.visual_prompt_parts.length === 0) && (
                        <div className="w-full text-sm rounded-lg p-4 bg-muted/30 border border-border text-muted-foreground">
                            {parsedData.visual_prompt}
                        </div>
                    )}
                </div>
            )}

            {/* Generate AI Button - Only in non-compact mode */}
            {!compact && onGenerate && (
                <div className="mt-6">
                    <Button 
                        onClick={onGenerate} 
                        disabled={isGeneratingImage}
                        className="w-full h-14 text-lg font-bold shadow-xl gap-2 rounded-xl"
                        size="lg"
                    >
                        {isGeneratingImage ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Sedang Menggambar...</>
                        ) : (
                            <><Sparkles className="w-5 h-5" /> Generate Gambar AI</>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

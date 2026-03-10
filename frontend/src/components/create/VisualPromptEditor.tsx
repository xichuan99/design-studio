import React, { useState } from "react";
import { Beaker, Sparkles, Loader2, Undo2, ChevronDown, Check } from "lucide-react";
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
}

const SUGGESTIONS = [
    "Buat lebih terang", 
    "Warna lebih hangat", 
    "Lebih dramatis",
    "Gaya minimalis", 
    "Latar belakang polos", 
    "Efek sinematik"
];

export function VisualPromptEditor({
    parsedData,
    onTogglePromptPart,
    onModifyPromptParts,
    compact = false
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
                    user_instruction: instruction
                })
            });

            if (!res.ok) throw new Error("Gagal memodifikasi prompt");
            
            const data = await res.json();
            onModifyPromptParts(data.modified_prompt_parts, data.modified_visual_prompt, data.indonesian_translation);
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
            
            {/* Header */}
            {!compact && (
                <div className="text-center space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                        Sempurnakan Prompt AI
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                        Ketik apa yang ingin Anda ubah, atau aktif/nonaktifkan elemen tertentu.
                    </p>
                </div>
            )}

            {/* Translation Box */}
            {parsedData.indonesian_translation && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                    <p className="text-sm font-medium text-primary">Maksud AI saat ini:</p>
                    <p className="text-sm text-muted-foreground mt-1">&quot;{parsedData.indonesian_translation}&quot;</p>
                </div>
            )}

            {/* Prompt Parts Toggles */}
            <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between px-2">
                    <h3 className="font-semibold text-foreground/80 text-sm tracking-wide uppercase">Opsi Visual Aktif</h3>
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
                                    {part.label}
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

            {/* AI Modification Box - Moved to bottom */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(var(--primary),0.05)] mt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Input 
                            placeholder="Apa yang ingin diubah? (Contoh: Buat lebih gelap)"
                            className="h-12 bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary/50 text-foreground"
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
        </div>
    );
}

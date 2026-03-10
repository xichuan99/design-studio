import React, { useMemo } from "react";
import { Sparkles, ArrowLeft, ArrowRight, Beaker, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParsedDesignData } from "@/app/create/types";

interface VisualPromptEditorProps {
    parsedData: ParsedDesignData;
    onTogglePromptPart: (index: number) => void;
    onEditPromptPart: (index: number, newValue: string) => void;
    onGenerateImage: () => void;
    onBack: () => void;
    isGenerating: boolean;
}

export function VisualPromptEditor({
    parsedData,
    onTogglePromptPart,
    onEditPromptPart,
    onGenerateImage,
    onBack,
    isGenerating
}: VisualPromptEditorProps) {
    // Merakit prompt yang sedang aktif
    const assembledPrompt = useMemo(() => {
        if (!parsedData.visual_prompt_parts || parsedData.visual_prompt_parts.length === 0) {
            return parsedData.visual_prompt || "";
        }
        return parsedData.visual_prompt_parts
            .filter(part => part.enabled)
            .map(part => part.value)
            .join(", ");
    }, [parsedData.visual_prompt_parts, parsedData.visual_prompt]);

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto animation-fade-in relative">
            
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <Beaker className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        AI Lab: Review Visual Prompt
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        Sempurnakan elemen gambar sebelum AI mulai menggambar. Centang untuk mengaktifkan/menonaktifkan, atau edit teksnya.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={onBack} disabled={isGenerating}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Button>
                    <Button 
                        onClick={onGenerateImage} 
                        disabled={isGenerating || !assembledPrompt.trim()}
                        className="font-bold shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 flex-1 sm:flex-none"
                    >
                        {isGenerating ? (
                            <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> Sedang Menggambar...</>
                        ) : (
                            <>Terapkan & Generate <ArrowRight className="w-4 h-4 ml-2" /></>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                
                {/* Panel Kiri: Text Summary & Assembled Preview */}
                <div className="flex flex-col gap-4 lg:w-1/3 shrink-0">
                    <Card className="bg-card shadow-sm overflow-hidden border-primary/10">
                        <div className="bg-primary/5 px-4 py-3 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                Teks Ditemukan
                            </h3>
                        </div>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Headline</span>
                                <p className="font-jakarta font-bold text-lg leading-tight">{parsedData.headline || "-"}</p>
                            </div>
                            {parsedData.sub_headline && (
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Sub-Headline</span>
                                    <p className="text-sm text-muted-foreground">{parsedData.sub_headline}</p>
                                </div>
                            )}
                            {parsedData.cta && (
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Call to Action</span>
                                    <Badge variant="secondary" className="text-xs">{parsedData.cta}</Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30 shadow-sm border-blue-500/20 flex-1 flex flex-col">
                        <div className="bg-blue-500/5 px-4 py-3 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <ImageIcon className="w-4 h-4" />
                                Prompt Final
                            </h3>
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col">
                            <p className="text-xs text-muted-foreground mb-3">
                                Ini adalah instruksi yang akan dikirim ke &quot;otak&quot; AI untuk menggambar background Anda:
                            </p>
                            <div className="bg-background border rounded-lg p-3 font-mono text-xs leading-relaxed text-foreground/80 flex-1 overflow-y-auto whitespace-pre-wrap break-words min-h-[150px]">
                                {assembledPrompt || <span className="italic text-muted-foreground">Tidak ada prompt yang aktif...</span>}
                            </div>
                        </CardContent>
                    </Card>

                    {(parsedData.suggested_colors?.length ?? 0) > 0 && (
                        <div className="bg-card rounded-xl border p-4 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Palet Warna</span>
                            <div className="flex gap-2">
                                {parsedData.suggested_colors?.map((color: string, i: number) => (
                                    <div 
                                        key={i} 
                                        className="w-6 h-6 rounded-full shadow-inner border border-border/50" 
                                        style={{ backgroundColor: color }} 
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel Kanan: Editable Prompt Parts */}
                <div className="flex-1 bg-card rounded-xl border shadow-inner p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold mb-4">Detail Visual Background</h3>
                    
                    {parsedData.visual_prompt_parts && parsedData.visual_prompt_parts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parsedData.visual_prompt_parts.map((part, idx) => (
                                <div 
                                    key={idx} 
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 bg-background
                                        ${part.enabled 
                                            ? 'border-primary/40 shadow-sm ring-1 ring-primary/10' 
                                            : 'border-muted opacity-60 bg-muted/20'}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={part.enabled}
                                                onChange={() => onTogglePromptPart(idx)}
                                                className="w-4 h-4 rounded border-primary/50 text-primary focus:ring-primary/20 cursor-pointer"
                                                id={`part-${idx}`}
                                            />
                                            <label 
                                                htmlFor={`part-${idx}`}
                                                className={`text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-colors
                                                    ${part.enabled ? 'text-primary' : 'text-muted-foreground'}`}
                                            >
                                                {part.label}
                                            </label>
                                        </div>
                                    </div>
                                    <textarea
                                        value={part.value}
                                        onChange={(e) => onEditPromptPart(idx, e.target.value)}
                                        disabled={!part.enabled}
                                        placeholder={`Masukkan detail ${part.label.toLowerCase()}...`}
                                        className={`w-full text-sm resize-y rounded-lg p-2.5 min-h-[120px] transition-colors
                                            focus:outline-none focus:ring-2 focus:ring-primary/40
                                            ${part.enabled 
                                                ? 'bg-muted/30 border-muted placeholder:text-muted-foreground/50' 
                                                : 'bg-transparent border-transparent cursor-not-allowed'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="w-full text-sm resize-y rounded-lg p-4 min-h-[120px] bg-muted/30 border border-muted focus:outline-none focus:ring-2 focus:ring-primary/40 overflow-y-auto whitespace-pre-wrap break-words">
                             {parsedData.visual_prompt}
                         </div>
                    )}
                </div>
            </div>
            
        </div>
    );
}

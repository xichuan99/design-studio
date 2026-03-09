import React from "react";
import { LayoutTemplate } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParsedDesignData } from "@/app/create/types";

interface DesignAnalysisCardProps {
    parsedData: ParsedDesignData;
    onTogglePromptPart: (index: number) => void;
    onEditPromptPart: (index: number, newValue: string) => void;
}

export function DesignAnalysisCard({
    parsedData,
    onTogglePromptPart,
    onEditPromptPart
}: DesignAnalysisCardProps) {
    return (
        <Card className="w-80 shrink-0 shadow-lg border-primary/10 bg-card/95 backdrop-blur h-fit max-h-full overflow-y-auto">
            <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutTemplate className="w-4 h-4 text-primary" />
                    Struktur Teks
                </CardTitle>
                <CardDescription>
                    AI telah membedah teks promo Anda menjadi elemen-elemen grafis yang siap diposisikan di atas template.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Headline</h4>
                    <p className="text-3xl font-jakarta font-black leading-tight text-foreground">{parsedData.headline}</p>
                </div>

                {parsedData.sub_headline && (
                    <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sub-Headline</h4>
                        <p className="text-lg text-muted-foreground font-medium">{parsedData.sub_headline}</p>
                    </div>
                )}

                {parsedData.cta && (
                    <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Call To Action</h4>
                        <Badge variant="default" className="text-md px-4 py-1.5">{parsedData.cta}</Badge>
                    </div>
                )}

                <div className="pt-4 border-t">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Prompt Gambar (Background)</h4>
                    {parsedData.visual_prompt_parts && parsedData.visual_prompt_parts.length > 0 ? (
                        <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
                            {parsedData.visual_prompt_parts.map((part, idx) => (
                                <div key={idx} className={`flex flex-col gap-1.5 transition-opacity ${part.enabled ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={part.enabled}
                                            onChange={() => onTogglePromptPart(idx)}
                                            className="w-3.5 h-3.5 rounded border-primary/50 text-primary focus:ring-primary/20 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{part.label}</span>
                                    </div>
                                    <textarea
                                        value={part.value}
                                        onChange={(e) => onEditPromptPart(idx, e.target.value)}
                                        disabled={!part.enabled}
                                        className="text-xs font-mono bg-background border border-border/50 rounded p-1.5 w-full resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 h-12"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs font-mono bg-muted p-2 rounded-md text-muted-foreground leading-relaxed">
                            {parsedData.visual_prompt}
                        </p>
                    )}
                </div>

                {(parsedData.suggested_colors?.length ?? 0) > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Rekomendasi Warna</h4>
                        <div className="flex gap-3">
                            {parsedData.suggested_colors?.map((color: string, i: number) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-full shadow-inner border border-border" style={{ backgroundColor: color }} />
                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{color}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

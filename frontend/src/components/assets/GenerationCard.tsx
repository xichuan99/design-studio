"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AiGeneration } from "@/lib/api/types";

interface GenerationCardProps {
    generation: AiGeneration;
}

export function GenerationCard({ generation }: GenerationCardProps) {
    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = generation.result_url;
        a.download = `design-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const label = generation.raw_text
        ? generation.raw_text.slice(0, 40) + (generation.raw_text.length > 40 ? "…" : "")
        : "Generate Desain";

    const date = new Date(generation.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <Card className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/40 transition-colors">
            {/* Thumbnail */}
            <div className="aspect-square bg-muted relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={generation.result_url}
                    alt={label}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-32 gap-2 text-xs"
                        onClick={handleDownload}
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download
                    </Button>
                </div>

                {/* Badge */}
                <span className="absolute top-2 right-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full font-medium border border-white/10 pointer-events-none">
                    AI Generate
                </span>
            </div>

            {/* Meta */}
            <div className="p-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground truncate" title={label}>
                    {label}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{date}</p>
            </div>
        </Card>
    );
}

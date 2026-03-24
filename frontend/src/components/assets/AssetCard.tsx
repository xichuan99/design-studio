"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Download } from "lucide-react";
import Image from "next/image";
import { AiToolResult } from "@/lib/api/types";

interface AssetCardProps {
    result: AiToolResult;
    onDelete: (id: string) => Promise<void>;
}

const TOOL_LABELS: Record<string, string> = {
    background_swap: "BG Swap",
    upscale: "Upscale",
    retouch: "Retouch",
    id_photo: "Pasfoto",
    magic_eraser: "Magic Eraser",
    generative_expand: "Expand",
    watermark: "Watermark",
    product_scene: "Product Scene",
    text_banner: "Text Banner",
    batch: "Batch",
};

export function AssetCard({ result, onDelete }: AssetCardProps) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm("Hapus aset ini? Storage kuota akan dikembalikan.")) return;
        setDeleting(true);
        await onDelete(result.id);
        setDeleting(false);
    };

    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = result.result_url;
        a.download = `${result.tool_name}-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const label = TOOL_LABELS[result.tool_name] ?? result.tool_name;
    const date = new Date(result.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <Card className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/40 transition-colors">
            {/* Thumbnail */}
            <div className="aspect-square bg-muted relative overflow-hidden">
                <Image
                    src={result.result_url}
                    alt={result.input_summary || label}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized={result.result_url.startsWith('http')}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-32 gap-2 text-xs"
                        onClick={handleDownload}
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-32 gap-2 text-xs"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Hapus
                    </Button>
                </div>

                {/* Tool badge */}
                <span className="absolute top-2 right-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full font-medium border border-white/10 pointer-events-none">
                    {label}
                </span>
            </div>

            {/* Meta */}
            <div className="p-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground truncate" title={result.input_summary ?? undefined}>
                    {result.input_summary || "AI Generated"}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{date}</p>
            </div>
        </Card>
    );
}

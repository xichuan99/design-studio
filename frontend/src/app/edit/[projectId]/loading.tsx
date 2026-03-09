"use client";

import { Loader2 } from "lucide-react";

export default function EditorLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6 text-muted-foreground bg-card p-10 rounded-2xl shadow-xl border">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="space-y-3 w-56">
                    <div className="flex items-center gap-3 text-sm text-primary font-medium scale-105 transition-all duration-300">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-primary animate-pulse" />
                        <span>Memuat project...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground/40 transition-all duration-300">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/30" />
                        <span>Memuat gambar...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground/40 transition-all duration-300">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/30" />
                        <span>Menyiapkan canvas...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

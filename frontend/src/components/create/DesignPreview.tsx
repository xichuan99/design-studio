import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesignPreviewProps {
    imageUrl: string | null;
    onProceedToEditor: () => void;
    isSaving: boolean;
}

export function DesignPreview({ imageUrl, onProceedToEditor, isSaving }: DesignPreviewProps) {
    return (
        <div className="relative group w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl border bg-card aspect-square sm:aspect-video flex items-center justify-center">
            {imageUrl ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Generated Design"
                        className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Button
                            size="lg"
                            className="text-lg px-8 py-6 rounded-full shadow-2xl hover:scale-105 transition-transform"
                            onClick={onProceedToEditor}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Menyimpan...</>
                            ) : (
                                <>Lanjut ke Editor <ArrowRight className="w-5 h-5 ml-2" /></>
                            )}
                        </Button>
                    </div>
                </>
            ) : null}
        </div>
    );
}

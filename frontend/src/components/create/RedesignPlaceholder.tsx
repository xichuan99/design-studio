"use client";

import { ImagePlus } from "lucide-react";

interface RedesignPlaceholderProps {
    referencePreview: string | null;
    setSidebarOpen: (v: boolean) => void;
    setShowManualRef: (v: boolean) => void;
}

export function RedesignPlaceholder({ referencePreview, setSidebarOpen, setShowManualRef }: RedesignPlaceholderProps) {
    return (
        <div className="max-w-4xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in px-4">
            <div className="w-full max-w-2xl bg-card border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute top-4 right-4 z-10 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                    Target Redesign
                </div>

                {referencePreview ? (
                    <div className="space-y-6">
                        <div className="aspect-square w-full max-w-[400px] mx-auto relative rounded-2xl overflow-hidden border shadow-inner bg-muted/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={referencePreview}
                                alt="Pratinjau Referensi"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Foto acuan sudah siap</h2>
                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                Lengkapi arah perubahan di panel kiri, lalu mulai redesign untuk melihat hasil pertama yang siap Kamu rapikan di editor.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 space-y-6">
                        <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                            <ImagePlus className="w-12 h-12 text-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Mulai dari foto yang ingin diubah</h2>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                Redesign bekerja dari gambar acuan. Unggah satu foto dulu, lalu tentukan hasil akhir yang Kamu inginkan.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setShowManualRef(true);
                                setSidebarOpen(true);
                            }}
                            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-all shadow-md active:scale-95"
                        >
                            Unggah Sekarang
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

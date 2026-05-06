import React from "react";
import { ReferenceImageUpload } from "@/components/create/ReferenceImageUpload";

interface ProductSettingsProps {
    createMode: 'generate' | 'redesign';
    referenceFile: File | null;
    referencePreview: string | null;
    isDragOver: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    showManualRef: boolean;
    setShowManualRef: (val: boolean) => void;
    removeProductBg: boolean;
    setRemoveProductBg: (val: boolean) => void;
    handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveFile: () => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
}

export function ProductSettings({
    createMode,
    referenceFile,
    referencePreview,
    isDragOver,
    fileInputRef,
    showManualRef,
    setShowManualRef,
    removeProductBg,
    setRemoveProductBg,
    handleFileInputChange,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop
}: ProductSettingsProps) {
    return (
        <div className="space-y-2 pb-4 border-b">
            <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                    {createMode === 'redesign' ? 'Foto Acuan' : 'Foto Produk atau Referensi'}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {createMode === 'redesign'
                        ? 'Unggah gambar utama yang ingin diubah. Ini menjadi dasar hasil redesign pertama.'
                        : 'Opsional. Tambahkan foto jika Kamu ingin AI memakai produk atau gaya visual tertentu sebagai acuan.'}
                </p>
            </div>
            <ReferenceImageUpload
                referenceFile={referenceFile}
                referencePreview={referencePreview}
                isDragOver={isDragOver}
                fileInputRef={fileInputRef}
                showManualRef={showManualRef}
                onFileInputChange={handleFileInputChange}
                onRemoveFile={handleRemoveFile}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onShowManualRef={() => setShowManualRef(true)}
                onHideManualRef={() => setShowManualRef(false)}
            />
            
            {referencePreview && createMode === 'generate' && (
                <div className="pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-xl hover:bg-muted/50 transition-colors bg-card">
                        <div className="flex items-center h-5 mt-0.5">
                            <input
                                type="checkbox"
                                checked={removeProductBg}
                                onChange={(e) => setRemoveProductBg(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-foreground">Gunakan sebagai produk utama</span>
                            <span className="text-xs text-muted-foreground">Background akan dibersihkan lalu produk dipasang ke desain baru secara otomatis.</span>
                        </div>
                    </label>
                </div>
            )}
        </div>
    );
}

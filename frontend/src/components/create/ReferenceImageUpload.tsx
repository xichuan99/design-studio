import React, { RefObject } from "react";
import { ImagePlus, X, Plus } from "lucide-react";

interface ReferenceImageUploadProps {
    referenceFile: File | null;
    referencePreview: string | null;
    isDragOver: boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
    showManualRef: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedTemplate: any;
    onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onShowManualRef: () => void;
    onHideManualRef: () => void;
}

export function ReferenceImageUpload({
    referenceFile,
    referencePreview,
    isDragOver,
    fileInputRef,
    showManualRef,
    selectedTemplate,
    onFileInputChange,
    onRemoveFile,
    onDragOver,
    onDragLeave,
    onDrop,
    onShowManualRef,
    onHideManualRef,
}: ReferenceImageUploadProps) {
    return (
        <div className="space-y-2">
            {(!selectedTemplate || showManualRef) ? (
                <>
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold">3</span>
                            Gambar Referensi {selectedTemplate ? "(Override)" : "(Opsional)"}
                        </label>
                        {selectedTemplate && showManualRef && (
                            <button
                                onClick={() => {
                                    onHideManualRef();
                                    onRemoveFile();
                                }}
                                className="text-xs text-destructive hover:underline font-medium px-2 py-1"
                            >
                                Batal
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={onFileInputChange}
                    />
                    {referencePreview ? (
                        <div className="relative group rounded-xl overflow-hidden border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={referencePreview}
                                alt="Gambar referensi"
                                className="w-full h-40 object-cover"
                            />
                            <button
                                type="button"
                                onClick={onRemoveFile}
                                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                title="Hapus gambar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="p-2 bg-muted/80 text-xs text-muted-foreground truncate">
                                {referenceFile?.name}
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragOver
                                ? "border-primary bg-primary/10"
                                : "border-muted-foreground/25 hover:bg-muted/50"
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                        >
                            <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">
                                {isDragOver ? "Lepaskan gambar di sini" : "Unggah Gambar"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                        </div>
                    )}
                </>
            ) : (
                <button
                    onClick={onShowManualRef}
                    className="w-full text-left text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-2 px-1 flex items-center gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" /> Tambah gambar referensi manual (opsional)
                </button>
            )}
        </div>
    );
}

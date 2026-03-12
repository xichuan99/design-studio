"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

interface ImageDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function ImageDropzone({ 
  onFileSelect, 
  accept = "image/*", 
  maxSizeMB = 10,
  className = ""
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diperbolehkan.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Ukuran maksimal file adalah ${maxSizeMB}MB.`);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragging ? "border-primary border-solid bg-primary/10 scale-[1.02] shadow-[0_0_30px_rgba(108,43,238,0.2)]" : "border-muted-foreground/25 hover:border-primary/50 bg-card"
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
      />
      <div className="flex justify-center mb-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-primary transition-all duration-200 ${isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"}`}>
          <UploadCloud className={`w-8 h-8 transition-all ${isDragging ? "animate-bounce" : ""}`} />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-1">Upload foto produk Anda</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Tarik & letakkan file di sini, atau klik untuk memilih file
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="w-4 h-4" />
        <span>Mendukung JPG, PNG (Max {maxSizeMB}MB)</span>
      </div>
    </div>
  );
}

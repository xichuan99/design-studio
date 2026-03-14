"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

interface BatchImageDropzoneProps {
  onFilesSelect: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  className?: string;
}

export function BatchImageDropzone({ 
  onFilesSelect, 
  accept = "image/*", 
  maxSizeMB = 5,
  maxFiles = 10,
  className = ""
}: BatchImageDropzoneProps) {
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

  const processFiles = (fileList: FileList | null | undefined) => {
    if (!fileList || fileList.length === 0) return;
    
    const validFiles: File[] = [];
    const filesArray = Array.from(fileList);

    if (filesArray.length > maxFiles) {
        alert(`Maksimal ${maxFiles} file yang diperbolehkan.`);
    }

    const filesToProcess = filesArray.slice(0, maxFiles);

    for (const file of filesToProcess) {
       if (!file.type.startsWith("image/")) {
           alert(`File ${file.name} bukan gambar.`);
           continue;
       }
       if (file.size > maxSizeMB * 1024 * 1024) {
           alert(`File ${file.name} melebihi batas ${maxSizeMB}MB.`);
           continue;
       }
       validFiles.push(file);
    }

    if (validFiles.length > 0) {
        onFilesSelect(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
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
        multiple
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
      <h3 className="text-lg font-semibold mb-1">Upload banyak foto sekaligus</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Pilih hingga {maxFiles} file foto
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="w-4 h-4" />
        <span>Mendukung JPG, PNG (Max {maxSizeMB}MB/file)</span>
      </div>
    </div>
  );
}

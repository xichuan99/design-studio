"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MoveHorizontal } from "lucide-react";
import Image from "next/image";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
  objectFit?: "cover" | "contain";
}

export function BeforeAfterSlider({ 
  beforeImage, 
  afterImage, 
  className = "",
  objectFit = "contain"
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden select-none cursor-ew-resize bg-muted ${className}`}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* After Image (Background) */}
      <Image
        src={afterImage}
        alt="After"
        fill
        className="object-cover"
        style={{ objectFit }}
        draggable={false}
        unoptimized
      />

      {/* Before Image (Foreground/Clipped) - clipPath inset: top right bottom left */}
      <Image
        src={beforeImage}
        alt="Before"
        fill
        className="object-cover"
        style={{ 
          objectFit,
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` 
        }}
        draggable={false}
        unoptimized
      />

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center pointer-events-none drop-shadow-md z-10"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.3)]">
          <MoveHorizontal className="w-5 h-5 text-gray-500" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute inset-0 p-4 pointer-events-none flex justify-between items-end">
        <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
          Before
        </span>
        <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
          After
        </span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import Image from "next/image";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
  altText?: string;
}

export function BeforeAfterSlider({ beforeImage, afterImage, className = "", altText = "Perbandingan Gambar" }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  const handleMove = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isHovered && event.type !== 'touchmove') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = 'touches' in event ? event.touches[0].clientX - rect.left : (event as React.MouseEvent).clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  return (
    <div 
      className={`relative w-full aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none ${className}`}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* After Image (Background) */}
      <Image
        src={afterImage}
        alt={altText + " (Sesudah)"}
        fill
        sizes="(max-width: 768px) 100vw, 800px"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        draggable="false"
      />

      {/* Before Image (Foreground, Clipped) */}
      <div 
        className="absolute inset-0 overflow-hidden" 
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <Image
          src={beforeImage}
          alt={altText + " (Sebelum)"}
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />
      </div>
      
      {/* Slider Line */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        {/* Slider Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-200">
          <ArrowLeftRight className="w-4 h-4 text-slate-800" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 inline-flex items-center px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-semibold z-20 pointer-events-none">
        Foto HP
      </div>
      <div className="absolute top-4 right-4 inline-flex items-center px-3 py-1 bg-purple-600/80 backdrop-blur-md rounded-full text-white text-xs font-semibold z-20 pointer-events-none">
        Hasil SmartDesign
      </div>
    </div>
  );
}

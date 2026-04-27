"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo2, Eraser, Trash2 } from "lucide-react";
import { CreditConfirmDialog } from "@/components/credits/CreditConfirmDialog";

interface CanvasMaskPainterProps {
  imageUrl: string;
  onMaskComplete: (maskBlob: Blob) => void;
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

interface Path {
  points: Point[];
  size: number;
}

export function CanvasMaskPainter({ imageUrl, onMaskComplete, className = "" }: CanvasMaskPainterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState([30]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent | MouseEvent).clientX;
      clientY = (e as React.MouseEvent | MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    // Prevent default touch behavior to avoid scrolling while drawing
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    
    const point = getCoordinates(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentPath({ points: [point], size: brushSize[0] });
  };

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isDrawing || !currentPath) return;
    
    // Prevent default touch behavior to avoid scrolling while drawing
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const point = getCoordinates(e);
    if (!point) return;

    setCurrentPath(prev => {
      if (!prev) return prev;
      return { ...prev, points: [...prev.points, point] };
    });
  }, [isDrawing, currentPath]);

  const stopDrawing = () => {
    if (isDrawing && currentPath && currentPath.points.length > 0) {
      setPaths(prev => [...prev, currentPath]);
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        setCursorPos({ x: clientX - rect.left, y: clientY - rect.top });
      }
    } else {
      clientX = (e as React.MouseEvent | MouseEvent).clientX;
      clientY = (e as React.MouseEvent | MouseEvent).clientY;
      setCursorPos({ x: clientX - rect.left, y: clientY - rect.top });
    }

    draw(e);
  }, [draw]);

  const handleMouseOut = () => {
    setIsHovering(false);
    setCursorPos(null);
    stopDrawing();
  };

  // Prevent scrolling when touching the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventTouchScroll, { passive: false });
    canvas.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouchScroll);
      canvas.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [imageLoaded]);

  // Handle window resize to match canvas to image dimensions
  useEffect(() => {
    if (!imgRef.current || !canvasRef.current || !imageLoaded) return;
    
    const img = imgRef.current;
    const canvas = canvasRef.current;
    
    // Set actual canvas resolution based on natural image size (for 1:1 match with original)
    // Fal.ai requires mask to perfectly match source image dimensions
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    renderCanvas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLoaded]);

  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !imgRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    const img = imgRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Scaling factors from render size to natural size
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    // Set brush style
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; // White mask
    
    // Draw all saved paths
    paths.forEach(path => {
      if (path.points.length === 0) return;
      ctx.lineWidth = path.size * scaleX; // Adjust brush size to natural resolution
      ctx.beginPath();
      ctx.moveTo(path.points[0].x * scaleX, path.points[0].y * scaleY);
      path.points.forEach(p => {
        ctx.lineTo(p.x * scaleX, p.y * scaleY);
      });
      ctx.stroke();
    });

    // Draw current path
    if (currentPath && currentPath.points.length > 0) {
      ctx.lineWidth = currentPath.size * scaleX;
      ctx.beginPath();
      ctx.moveTo(currentPath.points[0].x * scaleX, currentPath.points[0].y * scaleY);
      currentPath.points.forEach(p => {
        ctx.lineTo(p.x * scaleX, p.y * scaleY);
      });
      ctx.stroke();
    }
  }, [paths, currentPath]);

  // Re-render when paths change
  useEffect(() => {
    renderCanvas();
  }, [paths, currentPath, renderCanvas]);

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPaths([]);
  };

  const handleDone = () => {
    if (!canvasRef.current) return;
    if (!imgRef.current) return;

    if (paths.length === 0) {
      import('sonner').then(({ toast }) => toast.error('Silakan tandai area yang ingin dihapus terlebih dahulu'));
      return;
    }

    // Create a new canvas strictly for the black/white mask
    // Fal.ai requires white (255) for the area to fill, and black (0) for the area to keep
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasRef.current.width;
    maskCanvas.height = canvasRef.current.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Fill with black (keep)
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";
    maskCtx.strokeStyle = "#FFFFFF"; // Fill area

    // Draw paths in white
    paths.forEach(path => {
        if (path.points.length === 0) return;
        maskCtx.lineWidth = path.size * scaleX;
        maskCtx.beginPath();
        maskCtx.moveTo(path.points[0].x * scaleX, path.points[0].y * scaleY);
        path.points.forEach(p => {
            maskCtx.lineTo(p.x * scaleX, p.y * scaleY);
        });
        maskCtx.stroke();
    });

    // Verify mask has white pixels before sending
    const checkCtx = maskCanvas.getContext('2d');
    if (checkCtx) {
      const imageData = checkCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const hasWhitePixels = imageData.data.some((v, i) => i % 4 === 0 && v > 127);
      if (!hasWhitePixels) {
        import('sonner').then(({ toast }) => toast.error('Area yang ditandai terlalu kecil. Coba perbesar ukuran kuas.'));
        return;
      }
    }

    maskCanvas.toBlob((blob) => {
      if (blob) {
        onMaskComplete(blob);
      }
    }, 'image/png');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Eraser className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Ukuran Kuas</span>
          </div>
          <Slider
            value={brushSize}
            onValueChange={setBrushSize}
            max={100}
            min={5}
            step={1}
            className="w-32 sm:w-48"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUndo} 
            disabled={paths.length === 0}
            className="gap-2"
          >
            <Undo2 className="w-4 h-4" /> Undo
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClear}
            disabled={paths.length === 0}
            className="gap-2 text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> Bersihkan
          </Button>
        </div>
      </div>

      <div className="text-sm text-center text-muted-foreground py-2 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
        💡 <strong>Tips:</strong> Usap tepat di atas objek yang ingin dihilangkan. Pastikan seluruh bagian objek tertutup kuas.
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-auto flex justify-center items-center bg-zinc-100/50 rounded-xl overflow-hidden shadow-inner border"
        style={{ minHeight: '300px' }}
      >
        <div className="relative inline-block max-w-full">
          {/* Base Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Source for masking"
            className="max-h-[60vh] w-auto object-contain select-none pointer-events-none"
            onLoad={() => setImageLoaded(true)}
            crossOrigin="anonymous"
          />
          
          {/* Drawing Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full touch-none cursor-none opacity-80"
            onMouseDown={startDrawing}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={handleMouseOut}
            onMouseEnter={() => setIsHovering(true)}
            onTouchStart={() => setIsHovering(true)}
            onTouchEnd={() => { setIsHovering(false); setCursorPos(null); }}
          />

          {/* Dynamic Brush Cursor - Enhanced Visibility */}
          {isHovering && cursorPos && (
            <div 
              className="absolute pointer-events-none rounded-full border-[3px] border-white/90 bg-black/10 shadow-[0_0_4px_rgba(0,0,0,0.6),inset_0_0_4px_rgba(0,0,0,0.4)] transform -translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center mix-blend-difference"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: brushSize[0],
                height: brushSize[0]
              }}
            >
              <div className="w-1 h-1 bg-white/80 rounded-full" />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <CreditConfirmDialog
          title="Magic Eraser"
          description={`AI akan menghapus objek yang ditandai dan mengisi kekosongan secara natural. Ini akan memotong 20 kredit.`}
          cost={20}
          onConfirm={handleDone}
          disabled={paths.length === 0}
        >
          <Button 
            size="lg" 
            disabled={paths.length === 0}
            className="font-bold gap-2 px-8"
          >
            <Eraser className="w-5 h-5" />
            Hapus Objek
          </Button>
        </CreditConfirmDialog>
      </div>
    </div>
  );
}

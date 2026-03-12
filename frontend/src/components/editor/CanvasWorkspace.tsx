"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';


// We must dynamically import the StageCanvas to prevent SSR issues with canvas APIs
const StageCanvas = dynamic(() => import('./StageCanvas').then(mod => mod.StageCanvas), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-muted">Loading Canvas...</div>
});

interface CanvasWorkspaceProps {
    onBgStatusChange?: (status: string) => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({ onBgStatusChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { selectedElementIds, deleteSelectedElements, duplicateSelectedElements, elements, backgroundUrl, backgroundColor, canvasWidth, canvasHeight } = useCanvasStore();

    // Zoom State
    const [zoom, setZoom] = useState(1);
    
    // Auto-fit zoom logic
    const calculateFitZoom = React.useCallback(() => {
        if (!containerRef.current) return 1;
        
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Add some padding so it doesn't touch the window controls or edges
        const PADDING = 80;
        
        const scaleX = (containerWidth - PADDING) / canvasWidth;
        const scaleY = (containerHeight - PADDING) / canvasHeight;
        
        return Math.min(scaleX, scaleY, 1); // Don't scale above 100% implicitly
    }, [canvasWidth, canvasHeight]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
    const handleZoomReset = () => setZoom(calculateFitZoom());

    // Auto-fit on mount and resize
    useEffect(() => {
        if (!containerRef.current) return;
        
        // Use requestAnimationFrame to avoid synchronous setState warning
        const rafId = requestAnimationFrame(() => {
            setZoom(calculateFitZoom());
        });
        
        const observer = new ResizeObserver(() => {
            // Recalculate zoom when container size changes
            setZoom(calculateFitZoom());
        });
        
        observer.observe(containerRef.current);
        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [calculateFitZoom]);

    // Background Loading State
    const [bgStatus, setBgStatus] = useState<string>('loaded');

    // Forward bgStatus changes to parent
    useEffect(() => {
        if (onBgStatusChange) {
            onBgStatusChange(bgStatus);
        }
    }, [bgStatus, onBgStatusChange]);

    const isEmpty = elements.length === 0 && !backgroundUrl && (!backgroundColor || backgroundColor === '#ffffff');

    // This helps center the canvas visually when zoomed out
    const transformStyle = {
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease-out'
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const target = e.target as HTMLElement;
                // Avoid deleting when user is typing in an input or textarea
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                    if (selectedElementIds.length > 0) {
                        deleteSelectedElements();
                    }
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    useCanvasStore.getState().redo();
                } else {
                    useCanvasStore.getState().undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (selectedElementIds.length > 0) {
                    duplicateSelectedElements();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElementIds, deleteSelectedElements, duplicateSelectedElements]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-auto bg-[#0a0f1d] flex-1 flex items-center justify-center min-h-[500px]"
            style={{
                backgroundImage: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 1px, transparent 1px)',
                backgroundSize: '32px 32px'
            }}
            onClick={() => useCanvasStore.getState().selectElement(null)}
        >
            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg p-1 z-50"
                onClick={(e) => e.stopPropagation()}
            >
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono w-12 text-center select-none text-muted-foreground">
                    {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleZoomReset} title="Reset Zoom">
                    <Maximize className="h-4 w-4" />
                </Button>
            </div>

            {/* Empty State Overlay */}
            {isEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border shadow-sm flex flex-col items-center max-w-sm text-center">
                        <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <MousePointer2 className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Start your design</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Add text, shapes, or images from the left toolbar, or generate an AI background from the right panel to begin.
                        </p>
                    </div>
                </div>
            )}

            {/* Shimmer Loading Overlay */}
            {backgroundUrl && bgStatus === 'loading' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
                    <div className="relative flex flex-col items-center bg-card p-6 rounded-xl border shadow-lg gap-3">
                        <div className="flex gap-2 items-center text-primary">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="font-semibold">Memuat gambar...</span>
                        </div>
                        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="w-full h-full bg-primary/50 rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>
            )}

            <div
                className="shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-border/50 bg-card transition-shadow will-change-transform relative z-10"
                style={{
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    ...transformStyle
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {backgroundUrl && bgStatus === 'loading' && (
                    <div className="absolute inset-0 z-0 bg-muted animate-pulse" />
                )}
                <div className="relative z-10 w-full h-full">
                    <StageCanvas width={canvasWidth} height={canvasHeight} onBgStatusChange={setBgStatus} />
                </div>
            </div>
        </div>
    );
};

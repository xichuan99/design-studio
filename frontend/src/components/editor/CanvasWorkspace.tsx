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

export const CanvasWorkspace: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { selectedElementId, deleteElement, elements, backgroundUrl, backgroundColor } = useCanvasStore();

    // Zoom State
    const [zoom, setZoom] = useState(1);
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
    const handleZoomReset = () => setZoom(1);

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
                    if (selectedElementId) {
                        deleteElement(selectedElementId);
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
                if (selectedElementId) {
                    useCanvasStore.getState().duplicateElement(selectedElementId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElementId, deleteElement]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-auto bg-muted/20 flex-1 flex items-center justify-center min-h-[500px]"
            style={{
                backgroundImage: 'radial-gradient(circle, hsl(var(--foreground) / 0.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            }}
            onClick={() => useCanvasStore.getState().selectElement(null)}
        >
            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background border rounded-md shadow-sm p-1 z-10"
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

            <div
                className="shadow-lg bg-card transition-shadow hover:shadow-xl will-change-transform"
                style={{
                    width: '1080px',
                    height: '1080px',
                    ...transformStyle
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <StageCanvas width={1080} height={1080} />
            </div>
        </div>
    );
};

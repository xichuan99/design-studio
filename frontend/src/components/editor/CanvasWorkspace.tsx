"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, MousePointer2, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { FloatingToolbar } from './FloatingToolbar';
import { CanvasContextMenu } from './CanvasContextMenu';


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
    const canvasBoxRef = useRef<HTMLDivElement>(null);
    const { selectedElementIds, deleteSelectedElements, duplicateSelectedElements, elements, backgroundUrl, backgroundColor, canvasWidth, canvasHeight } = useCanvasStore();

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string | null } | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // Try to identify element from the konva stage, fallback to null
        setContextMenu({ x: e.clientX, y: e.clientY, elementId: null });
    };

    // We hook into Konva's onContextMenu via the store's stageRef in a useEffect
    useEffect(() => {
        const stage = useCanvasStore.getState().stageRef;
        if (!stage) return;
        const handleStageContextMenu = (e: { evt: MouseEvent; target: { id: () => string } }) => {
            e.evt.preventDefault();
            const clickedId = e.target.id();
            setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId: clickedId || null });
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stage.on('contextmenu', handleStageContextMenu as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return () => { stage.off('contextmenu', handleStageContextMenu as any); };
    // stageRef changes rarely; re-run on selectedElementIds to re-bind if stage initialized late
    }, [selectedElementIds]);

    // Zoom State
    const [zoom, setZoom] = useState(1);
    const manualZoomRef = useRef(false);

    // Floating toolbar position computation
    const getFloatingToolbarPosition = () => {
        if (!canvasBoxRef.current || selectedElementIds.length !== 1) return null;
        const el = elements.find(e => e.id === selectedElementIds[0]);
        if (!el) return null;
        const canvasRect = canvasBoxRef.current.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return null;
        // Center of element in canvas space, scaled, relative to container
        const centerX = (el.x + (el.width ?? 80) / 2) * zoom;
        const topY = el.y * zoom - 44; // 44px above element
        return {
            left: canvasRect.left - containerRect.left + centerX,
            top: canvasRect.top - containerRect.top + topY,
        };
    };
    const floatingPos = getFloatingToolbarPosition();

    // Grid toggle
    const [showGrid, setShowGrid] = React.useState(true);

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

    const handleZoomIn = () => { manualZoomRef.current = true; setZoom(prev => Math.min(prev + 0.25, 3)); };
    const handleZoomOut = () => { manualZoomRef.current = true; setZoom(prev => Math.max(prev - 0.25, 0.25)); };
    const handleZoomReset = () => { manualZoomRef.current = false; setZoom(calculateFitZoom()); };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            manualZoomRef.current = true;
            const delta = e.deltaY;
            const scaleBy = 1.05;
            setZoom(prev => {
                const newZoom = delta > 0 ? prev / scaleBy : prev * scaleBy;
                return Math.min(Math.max(newZoom, 0.1), 5); // 10% to 500%
            });
        }
    };

    // Auto-fit on mount and resize
    useEffect(() => {
        if (!containerRef.current) return;
        
        // Use requestAnimationFrame to avoid synchronous setState warning
        const rafId = requestAnimationFrame(() => {
            if (!manualZoomRef.current) setZoom(calculateFitZoom());
        });
        
        const observer = new ResizeObserver(() => {
            // Recalculate zoom when container size changes
            if (!manualZoomRef.current) setZoom(calculateFitZoom());
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
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            
            if (isTyping) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedElementIds.length > 0) {
                    deleteSelectedElements();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    useCanvasStore.getState().redo();
                } else {
                    useCanvasStore.getState().undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                useCanvasStore.getState().copyElements();
                if (useCanvasStore.getState().selectedElementIds.length > 0) {
                    toast.success('Elemen disalin');
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                useCanvasStore.getState().pasteElements();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                toast.success('Desain otomatis disimpan tiap perubahan.');
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
            style={showGrid ? {
                backgroundImage: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 1px, transparent 1px)',
                backgroundSize: '32px 32px'
            } : undefined}
            onClick={() => useCanvasStore.getState().selectElement(null)}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleZoomReset} title="Fit to screen">
                    <Maximize className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 transition-colors ${showGrid ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setShowGrid(p => !p)}
                    title="Toggle grid"
                >
                    <Grid3x3 className="h-4 w-4" />
                </Button>
            </div>

            {/* Empty State Overlay */}
            {isEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl border shadow-sm flex flex-col items-center max-w-sm text-center">
                        <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <MousePointer2 className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Mulai desainmu</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Tambahkan teks, bentuk, atau gambar dari toolbar kiri, atau hasilkan background AI dari panel kanan untuk memulai.
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
                ref={canvasBoxRef}
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

            {/* Floating Toolbar */}
            {floatingPos && selectedElementIds.length === 1 && (
                <FloatingToolbar
                    top={floatingPos.top}
                    left={floatingPos.left}
                    elementId={selectedElementIds[0]}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <CanvasContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    elementId={contextMenu.elementId}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};

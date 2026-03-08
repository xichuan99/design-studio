"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useCanvasStore } from '@/store/useCanvasStore';


// We must dynamically import the StageCanvas to prevent SSR issues with canvas APIs
const StageCanvas = dynamic(() => import('./StageCanvas').then(mod => mod.StageCanvas), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-muted">Loading Canvas...</div>
});

export const CanvasWorkspace: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const { selectedElementId, deleteElement } = useCanvasStore();

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const target = e.target as HTMLElement;
                // Avoid deleting when user is typing in an input or textarea
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                    if (selectedElementId) {
                        deleteElement(selectedElementId);
                    }
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (selectedElementId) {
                    useCanvasStore.getState().duplicateElement(selectedElementId);
                }
            } else if ((e.ctrlKey || e.metaKey) && selectedElementId) {
                // Layer shortcuts
                const store = useCanvasStore.getState();
                if (e.shiftKey && e.key === ']') {
                    e.preventDefault();
                    store.bringToFront(selectedElementId);
                } else if (e.shiftKey && e.key === '[') {
                    e.preventDefault();
                    store.sendToBack(selectedElementId);
                } else if (e.key === ']') {
                    e.preventDefault();
                    store.bringForward(selectedElementId);
                } else if (e.key === '[') {
                    e.preventDefault();
                    store.sendBackward(selectedElementId);
                }
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', updateSize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElementId, deleteElement]);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-gray-50 flex-1">
            {dimensions.width > 0 && dimensions.height > 0 && (
                <StageCanvas width={dimensions.width} height={dimensions.height} />
            )}
        </div>
    );
};

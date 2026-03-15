"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Copy, Trash2, ChevronUp, ChevronDown, Lock, Unlock, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';

/**
 * FloatingToolbar - hovers above the selected element on the canvas.
 * Rendered inside CanvasWorkspace as an absolutely-positioned overlay;
 * receives pre-calculated `top` / `left` from the parent.
 */
interface FloatingToolbarProps {
    top: number;
    left: number;
    elementId: string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ top, left, elementId }) => {
    const {
        deleteElement,
        duplicateElement,
        bringForward,
        sendBackward,
        bringToFront,
        sendToBack,
        toggleLock,
        elements,
        copyElements,
    } = useCanvasStore();

    const element = elements.find(el => el.id === elementId);
    if (!element) return null;

    const elIndex = elements.findIndex(el => el.id === elementId);
    const isTop = elIndex === elements.length - 1;
    const isBottom = elIndex === 0;

    const handleCopy = () => {
        copyElements();
        toast.success('Elemen disalin');
    };

    const btnBase = "flex items-center justify-center h-7 w-7 rounded hover:bg-white/10 transition-colors text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed";

    return (
        <div
            className="absolute z-50 flex items-center gap-0.5 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-2xl px-1.5 py-1"
            style={{ top: `${top}px`, left: `${left}px`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Copy */}
            <button className={btnBase} onClick={handleCopy} title="Salin (Ctrl+C)">
                <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Duplicate */}
            <button className={btnBase} onClick={() => { duplicateElement(elementId); toast.success('Elemen diduplikasi'); }} title="Duplikasi (Ctrl+D)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
            </button>

            <div className="w-px h-4 bg-white/20 mx-0.5" />

            {/* Layer order */}
            <button className={btnBase} onClick={() => bringToFront(elementId)} disabled={isTop} title="Ke Depan">
                <ArrowUpToLine className="h-3.5 w-3.5" />
            </button>
            <button className={btnBase} onClick={() => bringForward(elementId)} disabled={isTop} title="Maju">
                <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button className={btnBase} onClick={() => sendBackward(elementId)} disabled={isBottom} title="Mundur">
                <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button className={btnBase} onClick={() => sendToBack(elementId)} disabled={isBottom} title="Ke Belakang">
                <ArrowDownToLine className="h-3.5 w-3.5" />
            </button>

            <div className="w-px h-4 bg-white/20 mx-0.5" />

            {/* Lock */}
            <button className={btnBase} onClick={() => toggleLock(elementId)} title={element.locked ? 'Buka Kunci' : 'Kunci'}>
                {element.locked ? <Unlock className="h-3.5 w-3.5 text-yellow-400" /> : <Lock className="h-3.5 w-3.5" />}
            </button>

            <div className="w-px h-4 bg-white/20 mx-0.5" />

            {/* Delete */}
            <button
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300"
                onClick={() => deleteElement(elementId)}
                title="Hapus (Delete)"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};

"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Copy, Trash2, ChevronUp, ChevronDown, Lock, Unlock, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

/**
 * FloatingToolbar - hovers above the selected element on the canvas (desktop) 
 * or pinned to bottom (mobile).
 */
interface FloatingToolbarProps {
    top: number;
    left: number;
    elementId: string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ top, left, elementId }) => {
    const isMobile = useIsMobile();
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

    const btnBase = cn(
        "flex flex-col items-center justify-center rounded hover:bg-white/10 transition-colors text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed",
        isMobile ? "h-14 w-14" : "h-7 w-7"
    );
    const iconSize = isMobile ? "h-5 w-5 mb-0.5" : "h-3.5 w-3.5";
    const labelClass = "text-[9px] font-medium leading-none";

    const positionStyle = isMobile 
        ? { bottom: '80px', left: '50%', transform: 'translateX(-50%)', position: 'fixed' as const }
        : { top: `${top}px`, left: `${left}px`, transform: 'translateX(-50%)', position: 'absolute' as const };

    const containerClass = cn(
        "z-50 flex items-center bg-gray-900/95 backdrop-blur-sm border border-white/10 shadow-2xl",
        isMobile ? "rounded-xl px-2 py-2 gap-1 overflow-x-auto max-w-[95vw]" : "rounded-lg px-1.5 py-1 gap-0.5"
    );

    return (
        <div
            className={containerClass}
            style={positionStyle}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {/* Copy */}
            <button className={btnBase} onClick={handleCopy} title="Salin">
                <Copy className={iconSize} />
                {isMobile && <span className={labelClass}>Salin</span>}
            </button>

            {/* Duplicate */}
            <button className={btnBase} onClick={() => { duplicateElement(elementId); toast.success('Elemen diduplikasi'); }} title="Duplikasi">
                <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                {isMobile && <span className={labelClass}>Duplikat</span>}
            </button>

            <div className="w-px h-6 bg-white/20 mx-1 shrink-0" />

            {/* Layer order */}
            {isMobile ? (
                // Simplified layer order for mobile
                <>
                    <button className={btnBase} onClick={() => bringForward(elementId)} disabled={isTop} title="Maju">
                        <ChevronUp className={iconSize} />
                        <span className={labelClass}>Maju</span>
                    </button>
                    <button className={btnBase} onClick={() => sendBackward(elementId)} disabled={isBottom} title="Mundur">
                        <ChevronDown className={iconSize} />
                        <span className={labelClass}>Mundur</span>
                    </button>
                </>
            ) : (
                <>
                    <button className={btnBase} onClick={() => bringToFront(elementId)} disabled={isTop} title="Ke Depan"><ArrowUpToLine className={iconSize} /></button>
                    <button className={btnBase} onClick={() => bringForward(elementId)} disabled={isTop} title="Maju"><ChevronUp className={iconSize} /></button>
                    <button className={btnBase} onClick={() => sendBackward(elementId)} disabled={isBottom} title="Mundur"><ChevronDown className={iconSize} /></button>
                    <button className={btnBase} onClick={() => sendToBack(elementId)} disabled={isBottom} title="Ke Belakang"><ArrowDownToLine className={iconSize} /></button>
                </>
            )}

            <div className="w-px h-6 bg-white/20 mx-1 shrink-0" />

            {/* Lock */}
            <button className={btnBase} onClick={() => toggleLock(elementId)} title={element.locked ? 'Buka Kunci' : 'Kunci'}>
                {element.locked ? <Unlock className={cn(iconSize, "text-yellow-400")} /> : <Lock className={iconSize} />}
                {isMobile && <span className={labelClass}>{element.locked ? 'Buka' : 'Kunci'}</span>}
            </button>

            <div className="w-px h-6 bg-white/20 mx-1 shrink-0" />

            {/* Delete */}
            <button
                className={cn(btnBase, "text-red-400 hover:text-red-300 hover:bg-red-500/20")}
                onClick={() => deleteElement(elementId)}
                title="Hapus"
            >
                <Trash2 className={iconSize} />
                {isMobile && <span className={labelClass}>Hapus</span>}
            </button>
        </div>
    );
};

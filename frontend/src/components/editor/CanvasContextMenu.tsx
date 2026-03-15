"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Copy, Trash2, ClipboardPaste, ChevronUp, ChevronDown, Lock, Unlock, CopyPlus, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';

interface ContextMenuProps {
    x: number;
    y: number;
    elementId: string | null;
    onClose: () => void;
}

export const CanvasContextMenu: React.FC<ContextMenuProps> = ({ x, y, elementId, onClose }) => {
    const {
        deleteElement,
        deleteSelectedElements,
        duplicateElement,
        duplicateSelectedElements,
        bringForward,
        sendBackward,
        bringToFront,
        sendToBack,
        toggleLock,
        elements,
        selectedElementIds,
        copyElements,
        pasteElements,
        clipboard,
    } = useCanvasStore();

    const element = elementId ? elements.find(el => el.id === elementId) : null;
    const elIndex = elementId ? elements.findIndex(el => el.id === elementId) : -1;
    const isTop = elIndex === elements.length - 1;
    const isBottom = elIndex === 0;

    const handleClose = (callback: () => void) => {
        callback();
        onClose();
    };

    const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, disabled = false, danger = false) => (
        <button
            onClick={() => handleClose(onClick)}
            disabled={disabled}
            className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left rounded transition-colors
                ${danger ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-foreground/90 hover:bg-accent hover:text-foreground'}
                disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            <span className="w-4">{icon}</span>
            {label}
        </button>
    );

    const separator = <div className="my-1 border-t border-border/50" />;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[100]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />

            <div
                className="fixed z-[101] min-w-[180px] bg-popover border border-border rounded-xl shadow-2xl p-1.5 text-sm"
                style={{ top: `${y}px`, left: `${x}px` }}
            >
                {/* Copy / Paste */}
                {element && menuItem(
                    'Salin',
                    <Copy className="h-3.5 w-3.5" />,
                    () => { copyElements(); toast.success('Elemen disalin'); }
                )}
                {menuItem(
                    'Tempel',
                    <ClipboardPaste className="h-3.5 w-3.5" />,
                    () => pasteElements(),
                    !clipboard || clipboard.length === 0
                )}

                {separator}

                {/* Duplicate */}
                {element && menuItem(
                    'Duplikasi',
                    <CopyPlus className="h-3.5 w-3.5" />,
                    () => selectedElementIds.length > 1 ? duplicateSelectedElements() : duplicateElement(element.id)
                )}

                {element && separator}

                {/* Layer order */}
                {element && menuItem(
                    'Ke Depan',
                    <ArrowUpToLine className="h-3.5 w-3.5" />,
                    () => bringToFront(element.id),
                    isTop
                )}
                {element && menuItem(
                    'Maju Satu Layer',
                    <ChevronUp className="h-3.5 w-3.5" />,
                    () => bringForward(element.id),
                    isTop
                )}
                {element && menuItem(
                    'Mundur Satu Layer',
                    <ChevronDown className="h-3.5 w-3.5" />,
                    () => sendBackward(element.id),
                    isBottom
                )}
                {element && menuItem(
                    'Ke Belakang',
                    <ArrowDownToLine className="h-3.5 w-3.5" />,
                    () => sendToBack(element.id),
                    isBottom
                )}

                {element && separator}

                {/* Lock */}
                {element && menuItem(
                    element.locked ? 'Buka Kunci Elemen' : 'Kunci Elemen',
                    element.locked ? <Unlock className="h-3.5 w-3.5 text-yellow-400" /> : <Lock className="h-3.5 w-3.5" />,
                    () => toggleLock(element.id)
                )}

                {element && separator}

                {/* Delete */}
                {element && menuItem(
                    selectedElementIds.length > 1 ? `Hapus ${selectedElementIds.length} Elemen` : 'Hapus Elemen',
                    <Trash2 className="h-3.5 w-3.5" />,
                    () => selectedElementIds.length > 1 ? deleteSelectedElements() : deleteElement(element.id),
                    false,
                    true
                )}

                {/* Paste-only when no element right-clicked */}
                {!element && (
                    <div className="px-3 py-1.5">
                        <p className="text-xs text-muted-foreground">Klik kanan pada elemen untuk opsi lebih lanjut.</p>
                    </div>
                )}
            </div>
        </>
    );
};

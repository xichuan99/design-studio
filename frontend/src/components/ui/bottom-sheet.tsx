import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string; // allow overriding internal content container styling
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
    // Prevent background scrolling when bottom sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-[101] bg-background border-t border-border shadow-2xl transition-transform duration-300 ease-in-out rounded-t-3xl flex flex-col",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
                style={{
                    maxHeight: '85vh',
                }}
            >
                {/* Drag Handle Area */}
                <div 
                    className="w-full flex items-center justify-center p-3 cursor-grab active:cursor-grabbing shrink-0"
                    onClick={onClose} // Optional: clicking handle area closes it
                >
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header (optional) */}
                {(title) && (
                    <div className="px-6 pb-4 pt-1 flex items-center justify-between shrink-0">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className={cn("px-6 pb-6 overflow-y-auto w-full h-full", className)}>
                    {children}
                </div>
            </div>
        </>
    );
}

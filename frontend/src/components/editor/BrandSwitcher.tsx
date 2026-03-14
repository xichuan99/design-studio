"use client";

import React, { useState } from 'react';
import { useBrandKit } from '@/hooks/useBrandKit';
import { Palette, CheckCircle2, ChevronDown } from 'lucide-react';

interface BrandSwitcherProps {
    onSwitch?: () => void;
}

export const BrandSwitcher: React.FC<BrandSwitcherProps> = ({ onSwitch }) => {
    const { brandKits, activeBrandProfile, switchBrand, isLoading } = useBrandKit();
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    if (isLoading || brandKits.length === 0) {
        return null;
    }

    const handleSwitch = async (id: string) => {
        if (id === activeBrandProfile?.id) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        const success = await switchBrand(id);
        setIsSwitching(false);
        if (success) {
            setIsOpen(false);
            if (onSwitch) onSwitch();
        }
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                title="Ganti Brand Kit Aktif"
            >
                <Palette className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                
                {/* Visual Preview Dots of Active Brand */}
                {activeBrandProfile && activeBrandProfile.colors && activeBrandProfile.colors.length > 0 ? (
                    <div className="flex -space-x-1.5 hidden sm:flex">
                        {activeBrandProfile.colors.slice(0, 3).map((c, i) => (
                            <div 
                                key={i} 
                                className="w-4 h-4 rounded-full border border-background shadow-sm"
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                ) : (
                    <span className="text-xs font-medium truncate max-w-[100px]">
                        {activeBrandProfile ? activeBrandProfile.name : "Pilih Brand"}
                    </span>
                )}
                
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop to close when clicking outside */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    
                    <div className="absolute top-11 left-0 z-50 w-64 p-2 bg-popover border border-border rounded-xl shadow-lg flex flex-col gap-1">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Brand Kits
                        </div>
                        
                        {brandKits.map(kit => {
                            const isActive = kit.id === activeBrandProfile?.id;
                            return (
                                <button
                                    key={kit.id}
                                    onClick={() => handleSwitch(kit.id)}
                                    disabled={isSwitching}
                                    className={`flex p-2 rounded-lg items-center gap-2.5 transition-colors disabled:opacity-50 text-left
                                        ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground text-foreground'}
                                    `}
                                >
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        {kit.colors.slice(0, 3).map((c, i) => (
                                            <div 
                                                key={i} 
                                                className="w-5 h-5 rounded-full border border-background shadow-sm"
                                                style={{ backgroundColor: c.hex }}
                                            />
                                        ))}
                                    </div>
                                    <span className="font-medium text-xs truncate flex-1 leading-tight">
                                        {kit.name}
                                    </span>
                                    {isActive && <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

"use client";

import React, { useState } from 'react';
import { CopywritingPanel } from './CopywritingPanel';
import { ManualTextPanel } from './ManualTextPanel';
import { MagicTextPanel } from './MagicTextPanel';
import { Type, Wand2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type TeksTab = 'manual' | 'ai' | 'magic';

const TEKS_TABS: { id: TeksTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'manual', label: 'Teks', icon: Plus, desc: 'Teks standard & Brand' },
    { id: 'ai', label: 'Teks AI', icon: Type, desc: 'Draft teks otomatis' },
    { id: 'magic', label: 'Magic Text', icon: Wand2, desc: 'Format teks otomatis' },
];

export const EditorTeksPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TeksTab>('manual');

    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Header / Sub-navigation */}
            <div className="flex flex-col p-4 pb-2 border-b shrink-0 bg-background/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-md">
                        <Type className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm">Teks</h2>
                        <p className="text-[10px] text-muted-foreground">Tambahkan teks ke desain</p>
                    </div>
                </div>

                {/* Pill Navigation */}
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {TEKS_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-md transition-all relative",
                                    isActive 
                                        ? "bg-background text-foreground shadow-[0_0_12px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500/30" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <div className="flex items-center gap-1.5">
                                    <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-500" : "")} />
                                    <span className="text-[11px] font-medium">{tab.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'manual' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        <ManualTextPanel />
                    </div>
                )}
                {activeTab === 'ai' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        <CopywritingPanel />
                    </div>
                )}
                {activeTab === 'magic' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        <MagicTextPanel />
                    </div>
                )}
            </div>
        </div>
    );
};

"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';

const AIPromptPanel = dynamic(
    () => import('./AIPromptPanel').then(mod => mod.AIPromptPanel),
    { 
        loading: () => <div className="flex h-full items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>,
        ssr: false 
    }
);

const SmartAdPanel = dynamic(
    () => import('./SmartAdPanel').then(mod => mod.SmartAdPanel),
    { 
        loading: () => <div className="flex h-full items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>,
        ssr: false 
    }
);
import { cn } from '@/lib/utils';

type StudioTab = 'prompt' | 'ad_creator';

const STUDIO_TABS: { id: StudioTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'prompt', label: 'Prompt', icon: Sparkles, desc: 'Teks ke Gambar' },
    { id: 'ad_creator', label: 'Foto Produk', icon: ImageIcon, desc: 'Ubah foto jadi Ads' },
];

export const AIStudioPanel: React.FC<{ autoOpenSmartAd?: boolean }> = ({ autoOpenSmartAd }) => {
    const [activeTab, setActiveTab] = useState<StudioTab>(autoOpenSmartAd ? 'ad_creator' : 'prompt');
    const handoffData = useCanvasStore((state) => state.handoffData);

    React.useEffect(() => {
        if (autoOpenSmartAd) {
            setActiveTab('ad_creator');
        }
    }, [autoOpenSmartAd]);

    React.useEffect(() => {
        if (handoffData?.source === 'bgremoval') {
            setActiveTab('ad_creator');
        }
    }, [handoffData?.source]);


    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Header */}
            <div className="flex flex-col p-4 pb-2 border-b shrink-0 bg-background/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-md">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm">AI Studio</h2>
                        <p className="text-[10px] text-muted-foreground">Pusat kreasi cerdas</p>
                    </div>
                </div>

                {/* Pill Navigation */}
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {STUDIO_TABS.map((tab) => {
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
                {activeTab === 'prompt' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        <AIPromptPanel />
                    </div>
                )}
                {activeTab === 'ad_creator' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none">
                        <SmartAdPanel />
                    </div>
                )}
            </div>
        </div>
    );
};

"use client";

import React, { useState } from 'react';
import { AIPromptPanel } from './AIPromptPanel';
import { MagicTextPanel } from './MagicTextPanel';
import { TextBannerPanel } from './TextBannerPanel';
import { Sparkles, Wand2, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIStudioTab = 'generate' | 'magictext' | 'textbanner';

const STUDIO_TABS: { id: AIStudioTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'generate', label: 'Generate', icon: Sparkles, desc: 'Buat gambar baru' },
    { id: 'magictext', label: 'Smart Text', icon: Wand2, desc: 'AI penata teks' },
    { id: 'textbanner', label: 'Text Banner', icon: Type, desc: 'Banner dekoratif' }
];

export const AIStudioPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AIStudioTab>('generate');

    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Header / Sub-navigation */}
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
                {/* We use CSS display to keep state alive, or conditionally render depending on performance preference. 
                    Given these are complex panels, conditional rendering is cleaner but unmounts state. 
                    For AI tools, unmounting is usually fine to reset the prompt state. */}
                {activeTab === 'generate' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        {/* We hide the internal header of AIPromptPanel using CSS since we have a global header now */}
                        <AIPromptPanel />
                    </div>
                )}
                {activeTab === 'magictext' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        <MagicTextPanel />
                    </div>
                )}
                {activeTab === 'textbanner' && (
                    <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                        <TextBannerPanel />
                    </div>
                )}
            </div>
        </div>
    );
};

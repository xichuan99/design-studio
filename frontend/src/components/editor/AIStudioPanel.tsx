"use client";

import React from 'react';
import { AIPromptPanel } from './AIPromptPanel';
import { Sparkles } from 'lucide-react';

export const AIStudioPanel: React.FC = () => {
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
                        <p className="text-[10px] text-muted-foreground">Pusat kreasi gambar cerdas</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-hidden [&>div]:h-full [&>div]:border-none [&>div>div:first-child]:hidden">
                    <AIPromptPanel />
                </div>
            </div>
        </div>
    );
};

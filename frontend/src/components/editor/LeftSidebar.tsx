"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { AIPromptPanel } from './AIPromptPanel';
import { MagicTextPanel } from './MagicTextPanel';
import { AIAssetsPanel } from './AIAssetsPanel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, Wand2, Image as ImageIcon, Wrench, Type, Square, Circle, Minus, Blocks, Upload, Trash2, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export const LeftSidebar: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tools' | 'ai' | 'magictext' | 'assets'>('ai');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Toolbar logic
    const { addElement, backgroundColor, setBackgroundColor, setBackgroundUrl } = useCanvasStore();
    const { uploadImage } = useProjectApi();
    const [saving, setSaving] = useState(false);

    const getSmartPosition = () => {
        const { elements, canvasWidth, canvasHeight } = useCanvasStore.getState();
        const baseX = canvasWidth ? canvasWidth / 2 - 100 : 300;
        const baseY = canvasHeight ? canvasHeight / 2 - 50 : 300;
        const offset = (elements.length % 5) * 30; // stagger
        return { x: baseX + offset, y: baseY + offset };
    };

    const handleAddText = () => {
        const pos = getSmartPosition();
        addElement({
            type: 'text',
            x: pos.x,
            y: pos.y,
            text: 'Heading',
            fontSize: 64,
            fontFamily: 'Inter',
            fill: '#0f172a',
            rotation: 0,
        });
    };

    const handleAddShape = (shapeType: 'rect' | 'circle' | 'line') => {
        const pos = getSmartPosition();
        addElement({
            type: 'shape',
            shapeType: shapeType,
            x: pos.x,
            y: pos.y,
            width: shapeType === 'line' ? 200 : 150,
            height: shapeType === 'line' ? 4 : 150,
            fill: '#e2e8f0',
            stroke: '#0f172a',
            strokeWidth: 0,
            rotation: 0,
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        try {
            const { url } = await uploadImage(file);

            const img = new window.Image();
            const proxyUrl = url.startsWith('http')
                ? `/api/proxy-image?url=${encodeURIComponent(url)}`
                : url;
            img.src = proxyUrl;

            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });

            const maxSize = 400;
            const originalWidth = img.naturalWidth || 800;
            const originalHeight = img.naturalHeight || 800;
            const scale = Math.min(
                maxSize / originalWidth,
                maxSize / originalHeight,
                1
            );

            const pos = getSmartPosition();
            addElement({
                type: 'image',
                x: pos.x,
                y: pos.y,
                width: originalWidth * scale,
                height: originalHeight * scale,
                url: url,
                rotation: 0,
            });
        } catch (err) {
            console.error('Failed to upload image', err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setSaving(false);
            if (e.target) e.target.value = '';
        }
    };

    const NavButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: LucideIcon, label: string }) => (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => {
                            setActiveTab(id);
                            if (isCollapsed) setIsCollapsed(false);
                        }}
                        className={cn(
                            "w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-200 group relative",
                            activeTab === id && !isCollapsed
                                ? "bg-primary/10 text-primary shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {activeTab === id && !isCollapsed && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-md" />
                        )}
                        <Icon className={cn(
                            "h-6 w-6 transition-transform",
                            activeTab === id && !isCollapsed ? "scale-110 drop-shadow-sm" : "group-hover:scale-110"
                        )} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const ToolButton = ({ icon: Icon, label, onClick, className = "" }: { icon: LucideIcon, label: string, onClick?: () => void, className?: string }) => (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full h-20 rounded-xl transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground group border border-transparent hover:border-border/50 ${className}`}
        >
            <Icon className="h-7 w-7 mb-2 transition-transform group-hover:scale-110 drop-shadow-sm" />
            <span className="text-[11px] font-medium tracking-wide">{label}</span>
        </button>
    );

    return (
        <div className="flex h-full border-r border-border/40 bg-background/80 backdrop-blur-xl shadow-xl z-40 relative transition-all duration-300">
            {/* Narrow Navigation Bar */}
            <div className="w-[80px] h-full flex flex-col items-center py-4 border-r border-border/40 gap-3 shrink-0 bg-card/50">
                <NavButton id="ai" icon={Sparkles} label="AI Generate" />
                <NavButton id="magictext" icon={Wand2} label="Magic Text" />
                <NavButton id="assets" icon={ImageIcon} label="Aset / Galeri" />
                
                <div className="w-10 h-px bg-border/50 my-2" />
                
                <NavButton id="tools" icon={Wrench} label="Manual Tools" />

                <div className="mt-auto" />
                
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors mt-4"
                >
                    {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
            </div>

            {/* Expandable Content Area */}
            <div 
                className={cn(
                    "h-full overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
                    isCollapsed ? "w-0 opacity-0" : "w-[300px] opacity-100"
                )}
            >
                {activeTab === 'ai' && <AIPromptPanel />}
                {activeTab === 'magictext' && <MagicTextPanel />}
                {activeTab === 'assets' && <AIAssetsPanel />}
                
                {activeTab === 'tools' && (
                    <div className="p-4 h-full flex flex-col gap-4 overflow-y-auto w-full">
                        <div className="flex items-center gap-2 border-b pb-4 shrink-0">
                            <Wrench className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold text-sm">Design Tools</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <ToolButton icon={Type} label="Add Text" onClick={handleAddText} />
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div>
                                        <ToolButton icon={Blocks} label="Shapes" />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent side="right" className="w-40 p-2 flex flex-col gap-1 ml-2 rounded-xl border-border/50 shadow-xl backdrop-blur-md bg-card/95">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shapes</div>
                                    <Button variant="ghost" size="sm" className="justify-start rounded-lg hover:bg-muted" onClick={() => handleAddShape('rect')}>
                                        <Square className="h-4 w-4 mr-3" /> Rectangle
                                    </Button>
                                    <Button variant="ghost" size="sm" className="justify-start rounded-lg hover:bg-muted" onClick={() => handleAddShape('circle')}>
                                        <Circle className="h-4 w-4 mr-3" /> Circle
                                    </Button>
                                    <Button variant="ghost" size="sm" className="justify-start rounded-lg hover:bg-muted" onClick={() => handleAddShape('line')}>
                                        <Minus className="h-4 w-4 mr-3" /> Line
                                    </Button>
                                </PopoverContent>
                            </Popover>

                            <label className="w-full cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={saving}
                                />
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-full h-20 rounded-xl transition-all duration-200 border border-transparent group",
                                    saving ? "opacity-50 cursor-not-allowed" : "hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                )}>
                                    <Upload className="h-7 w-7 mb-2 transition-transform group-hover:scale-110 drop-shadow-sm" />
                                    <span className="text-[11px] font-medium tracking-wide">Upload Image</span>
                                </div>
                            </label>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="px-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">Canvas Background</label>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full border-2 border-muted overflow-hidden flex items-center justify-center cursor-pointer relative shadow-sm hover:border-primary transition-colors shrink-0" title="Canvas Background Color">
                                        <input
                                            type="color"
                                            value={backgroundColor || '#ffffff'}
                                            onChange={(e) => setBackgroundColor(e.target.value)}
                                            className="absolute inset-0 w-16 h-16 -top-2 -left-2 cursor-pointer p-0 bg-transparent"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">Solid Color</span>
                                        <span className="text-xs text-muted-foreground uppercase">{backgroundColor || '#ffffff'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                variant="outline" 
                                className="w-full justify-start h-12 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30 rounded-xl mt-4"
                                onClick={() => setBackgroundUrl(null)}
                            >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Clear Image Background
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

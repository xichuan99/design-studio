"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Type, Square, Circle, Minus, Wand2, Blocks, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ToolbarProps {
    projectId?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ }) => {
    const { addElement, backgroundColor, setBackgroundColor } = useCanvasStore();
    const { uploadImage } = useProjectApi();
    const [saving, setSaving] = useState(false);

    const handleAddText = () => {
        addElement({
            type: 'text',
            x: 300,
            y: 300,
            text: 'Heading',
            fontSize: 64,
            fontFamily: 'Inter',
            fill: '#0f172a',
            rotation: 0,
        });
    };

    const handleAddShape = (shapeType: 'rect' | 'circle' | 'line') => {
        addElement({
            type: 'shape',
            shapeType: shapeType,
            x: 200,
            y: 200,
            width: shapeType === 'line' ? 200 : 150,
            height: shapeType === 'line' ? 4 : 150,
            fill: '#e2e8f0',
            stroke: '#0f172a',
            strokeWidth: shapeType === 'line' ? 0 : 0,
            rotation: 0,
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        try {
            const { url } = await uploadImage(file);
            addElement({
                type: 'image',
                x: 100,
                y: 100,
                url: url,
                rotation: 0,
            });
        } catch (err) {
            console.error('Failed to upload image', err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setSaving(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    // Helper for rendering a sidebar button
    const SidebarButton = ({ icon: Icon, label, onClick, className = "", title = "" }: { icon: React.ComponentType<{ className?: string }>, label: string, onClick?: () => void, className?: string, title?: string }) => (
        <button
            onClick={onClick}
            title={title}
            className={`flex flex-col items-center justify-center w-full h-16 rounded-xl transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground group ${className}`}
        >
            <Icon className="h-6 w-6 mb-1.5 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col gap-2 p-3 border-r bg-card h-full w-[88px] items-center shrink-0 shadow-sm z-30">
            <SidebarButton icon={Type} label="Text" onClick={handleAddText} />

            <Popover>
                <PopoverTrigger asChild>
                    <div>
                        <SidebarButton icon={Blocks} label="Elements" />
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
                <div className={`flex flex-col items-center justify-center w-full h-16 rounded-xl transition-all duration-200 ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted text-muted-foreground hover:text-foreground group'}`}>
                    <Upload className="h-6 w-6 mb-1.5 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-medium tracking-wide">Uploads</span>
                </div>
            </label>

            <div className="w-10 h-px bg-border my-2" />

            <SidebarButton
                icon={Wand2}
                label="AI BG"
                className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                onClick={() => {
                    const tabsList = document.querySelector('[role="tablist"]');
                    const aiTab = tabsList?.querySelector('[value="ai"]') as HTMLButtonElement | null;
                    if (aiTab) aiTab.click();
                }}
                title="Generate AI Background"
            />

            <div className="flex-1" />

            {/* Canvas Background Color Picker */}
            <div className="flex flex-col items-center mt-2 group relative w-full pb-4">
                <div className="h-10 w-10 rounded-full border-2 border-muted overflow-hidden flex items-center justify-center cursor-pointer relative shadow-sm hover:border-primary transition-colors" title="Canvas Background Color">
                    <input
                        type="color"
                        value={backgroundColor || '#ffffff'}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="absolute inset-0 w-14 h-14 -top-2 -left-2 cursor-pointer p-0 bg-transparent"
                    />
                </div>
                <span className="text-[9px] font-medium text-muted-foreground mt-2 uppercase tracking-wider">Bg Color</span>
            </div>
        </div>
    );
};

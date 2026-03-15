"use client";

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, MousePointer2, Palette, Loader2, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectApi, BrandKit } from '@/lib/api';

export const StylePanel: React.FC = () => {
    const { elements, selectedElementIds, updateElement, deleteSelectedElements, duplicateSelectedElements, bringForward, sendBackward, bringToFront, sendToBack, deleteElement, duplicateElement, groupElements, ungroupElements } = useCanvasStore();
    const api = useProjectApi();
    const [activeKit, setActiveKit] = React.useState<BrandKit | null>(null);
    const [isUpscaling, setIsUpscaling] = React.useState(false);

    React.useEffect(() => {
        api.getActiveBrandKit()
            .then(kit => setActiveKit(kit))
            .catch(err => console.error('Failed to load active brand kit', err));
    }, [api]);

    const handleUpscale = async () => {
        if (!selectedElement || selectedElement.type !== 'image' || !selectedElement.url) return;
        
        try {
            setIsUpscaling(true);
            const response = await fetch(selectedElement.url);
            const blob = await response.blob();
            const file = new File([blob], 'upscale-source.png', { type: blob.type || 'image/png' });
            
            const result = await api.upscaleImage(file);
            if (result && result.url) {
                updateElement(selectedElement.id, { url: result.url });
            }
        } catch (error) {
            console.error('Failed to upscale image:', error);
        } finally {
            setIsUpscaling(false);
        }
    };

    // Reusable swatch renderer
    const renderBrandSwatches = (applyColor: (hex: string) => void) => {
        if (!activeKit) return null;
        return (
            <div className="flex items-center gap-1.5 mt-2 mb-1 bg-muted/50 p-1.5 rounded border">
                <Palette className="w-3 h-3 text-indigo-500 mr-0.5" />
                {activeKit.colors.map((c, i) => (
                    <button
                        key={i}
                        className="w-4 h-4 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.hex }}
                        onClick={() => applyColor(c.hex)}
                        title={c.name}
                    />
                ))}
            </div>
        );
    };

    if (selectedElementIds.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-card">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MousePointer2 className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium">Belum ada elemen dipilih</p>
                <p className="text-xs opacity-70 mt-1">Klik pada elemen di canvas atau panel layer untuk mengedit panduan gaya.</p>
            </div>
        );
    }

    if (selectedElementIds.length > 1) {
        // Alignment helpers
        const selectedEls = elements.filter(el => selectedElementIds.includes(el.id));

        const getBox = (el: typeof selectedEls[0]) => ({
            x: el.x,
            y: el.y,
            r: el.x + (el.width ?? 80),
            b: el.y + (el.height ?? 40),
            cx: el.x + (el.width ?? 80) / 2,
            cy: el.y + (el.height ?? 40) / 2,
        });

        const alignLeft = () => {
            const minX = Math.min(...selectedEls.map(el => el.x));
            selectedEls.forEach(el => updateElement(el.id, { x: minX }));
        };
        const alignRight = () => {
            const maxR = Math.max(...selectedEls.map(el => el.x + (el.width ?? 80)));
            selectedEls.forEach(el => updateElement(el.id, { x: maxR - (el.width ?? 80) }));
        };
        const alignCenterH = () => {
            const avgCX = selectedEls.reduce((s, el) => s + el.x + (el.width ?? 80) / 2, 0) / selectedEls.length;
            selectedEls.forEach(el => updateElement(el.id, { x: avgCX - (el.width ?? 80) / 2 }));
        };
        const alignTop = () => {
            const minY = Math.min(...selectedEls.map(el => el.y));
            selectedEls.forEach(el => updateElement(el.id, { y: minY }));
        };
        const alignBottom = () => {
            const maxB = Math.max(...selectedEls.map(el => el.y + (el.height ?? 40)));
            selectedEls.forEach(el => updateElement(el.id, { y: maxB - (el.height ?? 40) }));
        };
        const alignCenterV = () => {
            const avgCY = selectedEls.reduce((s, el) => s + el.y + (el.height ?? 40) / 2, 0) / selectedEls.length;
            selectedEls.forEach(el => updateElement(el.id, { y: avgCY - (el.height ?? 40) / 2 }));
        };
        const distributeH = () => {
            const sorted = [...selectedEls].sort((a, b) => a.x - b.x);
            const totalW = sorted.reduce((s, el) => s + (el.width ?? 80), 0);
            const span = getBox(sorted[sorted.length - 1]).r - getBox(sorted[0]).x;
            const gap = (span - totalW) / (sorted.length - 1);
            let curX = sorted[0].x;
            sorted.forEach(el => {
                updateElement(el.id, { x: curX });
                curX += (el.width ?? 80) + gap;
            });
        };
        const distributeV = () => {
            const sorted = [...selectedEls].sort((a, b) => a.y - b.y);
            const totalH = sorted.reduce((s, el) => s + (el.height ?? 40), 0);
            const span = getBox(sorted[sorted.length - 1]).b - getBox(sorted[0]).y;
            const gap = (span - totalH) / (sorted.length - 1);
            let curY = sorted[0].y;
            sorted.forEach(el => {
                updateElement(el.id, { y: curY });
                curY += (el.height ?? 40) + gap;
            });
        };

        // Suppress unused import warning for getBox (used inside lambdas)
        void getBox;

        const AlignBtn = ({ label, title, onClick }: { label: string; title: string; onClick: () => void }) => (
            <button
                className="flex items-center justify-center h-8 w-full border rounded text-[10px] font-medium hover:bg-muted transition-colors"
                title={title}
                onClick={onClick}
            >
                {label}
            </button>
        );

        return (
            <div className="w-full border-l bg-card flex flex-col h-full overflow-y-auto">
                <div className="p-3 border-b font-medium flex flex-col gap-2">
                    <span className="text-sm">{selectedElementIds.length} Elemen Dipilih</span>
                    <div className="flex flex-col gap-1.5 w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={groupElements}>Grup Elemen</Button>
                        <div className="flex gap-1.5 w-full">
                            <Button variant="outline" size="sm" className="flex-1 text-blue-500 hover:bg-blue-50 text-xs" onClick={duplicateSelectedElements}>Duplikasi</Button>
                            <Button variant="outline" size="sm" className="flex-1 text-red-500 hover:bg-red-50 text-xs" onClick={deleteSelectedElements}>Hapus</Button>
                        </div>
                    </div>
                </div>

                {/* Alignment tools */}
                <div className="p-3 border-b">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sejajarkan</p>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                        <AlignBtn label="◧ Kiri" title="Sejajarkan ke kiri" onClick={alignLeft} />
                        <AlignBtn label="◫ Tengah" title="Sejajarkan ke tengah (horizontal)" onClick={alignCenterH} />
                        <AlignBtn label="◨ Kanan" title="Sejajarkan ke kanan" onClick={alignRight} />
                        <AlignBtn label="⬆ Atas" title="Sejajarkan ke atas" onClick={alignTop} />
                        <AlignBtn label="⬛ Tengah" title="Sejajarkan ke tengah (vertikal)" onClick={alignCenterV} />
                        <AlignBtn label="⬇ Bawah" title="Sejajarkan ke bawah" onClick={alignBottom} />
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Distribusikan</p>
                    <div className="grid grid-cols-2 gap-1">
                        <AlignBtn label="⬌ Horizontal" title="Distribusikan secara horizontal" onClick={distributeH} />
                        <AlignBtn label="⬍ Vertikal" title="Distribusikan secara vertikal" onClick={distributeV} />
                    </div>
                </div>
            </div>
        );
    }


    const selectedElement = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selectedElement) return null;

    if (selectedElement.type === 'group') {
        return (
            <div className="w-full border-l bg-card flex flex-col h-full overflow-y-auto">
                <div className="p-4 border-b font-medium flex justify-between items-center">
                    <span className="capitalize">Group</span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteElement(selectedElement.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="p-4">
                    <Button variant="outline" className="w-full text-foreground hover:bg-muted" onClick={ungroupElements}>
                        Ungroup
                    </Button>
                </div>
            </div>
        );
    }

    const updateAttr = (key: string, value: string | number | boolean | string[] | undefined) => {
        updateElement(selectedElement.id, { [key]: value });
    };

    const renderFillControl = (label: string, defaultColor: string) => {
        const isGradient = selectedElement.fillType === 'gradient';
        const c1 = selectedElement.gradientColors?.[0] || selectedElement.fill || defaultColor;
        const c2 = selectedElement.gradientColors?.[1] || '#ffffff';
        const angle = selectedElement.gradientAngle || 90;

        return (
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium">{label}</label>
                    <div className="flex bg-muted rounded p-0.5">
                        <button 
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${!isGradient ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'}`}
                            onClick={() => updateAttr('fillType', 'solid')}
                        >
                            Solid
                        </button>
                        <button 
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${isGradient ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'}`}
                            onClick={() => {
                                updateElement(selectedElement.id, { 
                                    fillType: 'gradient',
                                    gradientColors: [c1, c2],
                                    gradientAngle: angle
                                });
                            }}
                        >
                            Gradient
                        </button>
                    </div>
                </div>

                {!isGradient ? (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                            <input
                                type="color"
                                className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                value={selectedElement.fill || defaultColor}
                                onChange={(e) => updateAttr('fill', e.target.value)}
                            />
                            <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                {(selectedElement.fill || defaultColor)}
                            </span>
                        </div>
                        {renderBrandSwatches((c) => updateAttr('fill', c))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 p-2 bg-muted/30 border rounded-md">
                        <div className="flex gap-2">
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[9px] text-muted-foreground">Color 1</span>
                                <input
                                    type="color"
                                    className="w-full h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                                    value={c1}
                                    onChange={(e) => updateAttr('gradientColors', [e.target.value, c2])}
                                />
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[9px] text-muted-foreground">Color 2</span>
                                <input
                                    type="color"
                                    className="w-full h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                                    value={c2}
                                    onChange={(e) => updateAttr('gradientColors', [c1, e.target.value])}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-muted-foreground">Angle</span>
                                <span className="text-[9px] font-mono">{angle}°</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="360"
                                value={angle}
                                onChange={(e) => updateAttr('gradientAngle', parseInt(e.target.value))}
                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const elIndex = elements.findIndex(el => el.id === selectedElement.id);
    const isTop = elIndex === elements.length - 1;
    const isBottom = elIndex === 0;

    return (
        <div className="w-full border-l bg-card flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b font-medium flex justify-between items-center">
                <span className="capitalize">{selectedElement.type} Styles</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteElement(selectedElement.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Accordion type="multiple" defaultValue={['general', 'typography', 'formatting', 'effects', 'shape-basic', 'shape-border']} className="w-full space-y-4">

                    {/* General Section */}
                    <AccordionItem value="general" className="border-none bg-muted/30 rounded-lg px-3">
                        <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Umum</AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4 pb-3">

                            {/* Position & Size Inputs */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-muted-foreground">Posisi &amp; Ukuran</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">X</span>
                                        <Input
                                            type="number"
                                            value={Math.round(selectedElement.x)}
                                            onChange={(e) => updateAttr('x', parseFloat(e.target.value) || 0)}
                                            className="h-7 text-xs font-mono px-2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Y</span>
                                        <Input
                                            type="number"
                                            value={Math.round(selectedElement.y)}
                                            onChange={(e) => updateAttr('y', parseFloat(e.target.value) || 0)}
                                            className="h-7 text-xs font-mono px-2"
                                        />
                                    </div>
                                    {selectedElement.width !== undefined && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">W</span>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={Math.round(selectedElement.width)}
                                                onChange={(e) => updateAttr('width', Math.max(1, parseFloat(e.target.value) || 1))}
                                                className="h-7 text-xs font-mono px-2"
                                            />
                                        </div>
                                    )}
                                    {selectedElement.height !== undefined && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">H</span>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={Math.round(selectedElement.height)}
                                                onChange={(e) => updateAttr('height', Math.max(1, parseFloat(e.target.value) || 1))}
                                                className="h-7 text-xs font-mono px-2"
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Rotasi °</span>
                                        <Input
                                            type="number"
                                            min="-360" max="360"
                                            value={Math.round(selectedElement.rotation)}
                                            onChange={(e) => updateAttr('rotation', parseFloat(e.target.value) || 0)}
                                            className="h-7 text-xs font-mono px-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium flex justify-between">
                                    <span>Transparansi</span>
                                    <span className="text-muted-foreground">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="5" max="100"
                                    value={Math.round((selectedElement.opacity ?? 1) * 100)}
                                    onChange={(e) => updateAttr('opacity', parseInt(e.target.value) / 100)}
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium flex justify-between">
                                    <span>Urutan Layer</span>
                                    <span className="font-mono text-xs text-muted-foreground">{elIndex + 1} / {elements.length}</span>
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => bringToFront(selectedElement.id)} disabled={isTop}>↑↑ Depan</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => sendToBack(selectedElement.id)} disabled={isBottom}>↓↓ Belakang</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => bringForward(selectedElement.id)} disabled={isTop}>↑ Maju</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => sendBackward(selectedElement.id)} disabled={isBottom}>↓ Mundur</Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Text Specific Sections */}
                    {selectedElement.type === 'text' && (
                        <>
                            <AccordionItem value="typography" className="border-none bg-muted/30 rounded-lg px-3">
                                <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Tipografi</AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 pb-3">
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            className="w-full text-sm p-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                                            value={selectedElement.text || ''}
                                            onChange={(e) => updateAttr('text', e.target.value)}
                                            placeholder="Enter text..."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-medium">Font Family</label>
                                        <Select
                                            value={selectedElement.fontFamily || 'Inter'}
                                            onValueChange={(val) => updateAttr('fontFamily', val)}
                                        >
                                            <SelectTrigger className="w-full text-xs h-8 bg-background">
                                                <SelectValue placeholder="Font Family" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Inter" style={{ fontFamily: 'Inter' }}>Inter</SelectItem>
                                                <SelectItem value="Poppins" style={{ fontFamily: 'Poppins' }}>Poppins</SelectItem>
                                                <SelectItem value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</SelectItem>
                                                <SelectItem value="Playfair Display" style={{ fontFamily: '"Playfair Display", serif' }}>Playfair Display</SelectItem>
                                                <SelectItem value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</SelectItem>
                                                <SelectItem value="Oswald" style={{ fontFamily: 'Oswald' }}>Oswald</SelectItem>
                                                <SelectItem value="Lato" style={{ fontFamily: 'Lato' }}>Lato</SelectItem>
                                                <SelectItem value="Raleway" style={{ fontFamily: 'Raleway' }}>Raleway</SelectItem>
                                                <SelectItem value="Plus Jakarta Sans" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Plus Jakarta Sans</SelectItem>
                                                <SelectItem value="DM Sans" style={{ fontFamily: '"DM Sans", sans-serif' }}>DM Sans</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium">Size</label>
                                            <Input
                                                type="number"
                                                className="h-8 text-xs bg-background"
                                                value={Math.round(selectedElement.fontSize || 24)}
                                                onChange={(e) => updateAttr('fontSize', parseInt(e.target.value) || 24)}
                                            />
                                        </div>
                                        {renderFillControl('Color', '#000000')}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="formatting" className="border-none bg-muted/30 rounded-lg px-3">
                                <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Format</AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 pb-3">
                                    <div className="flex justify-between items-center bg-background p-1 rounded-md border text-muted-foreground">
                                        <Button variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}>
                                            <Bold className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}>
                                            <Italic className="h-3.5 w-3.5" />
                                        </Button>
                                        <div className="w-px h-4 bg-border mx-1" />
                                        <Button variant={selectedElement.align === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('align', 'left')}>
                                            <AlignLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant={(!selectedElement.align || selectedElement.align === 'center') ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('align', 'center')}>
                                            <AlignCenter className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant={selectedElement.align === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => updateAttr('align', 'right')}>
                                            <AlignRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-medium flex justify-between">
                                                <span>Jarak Huruf</span>
                                                <span className="text-muted-foreground">{selectedElement.letterSpacing || 0}px</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="-5" max="20" step="0.5"
                                                value={selectedElement.letterSpacing || 0}
                                                onChange={(e) => updateAttr('letterSpacing', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-medium flex justify-between">
                                                <span>Tinggi Baris</span>
                                                <span className="text-muted-foreground">{selectedElement.lineHeight || 1.2}</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5" max="3" step="0.1"
                                                value={selectedElement.lineHeight || 1.2}
                                                onChange={(e) => updateAttr('lineHeight', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </>
                    )}

                    {/* Shapes Specific Sections */}
                    {selectedElement.type === 'shape' && (
                        <AccordionItem value="shape-basic" className="border-none bg-muted/30 rounded-lg px-3">
                            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Tampilan</AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-4 pb-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5 col-span-2">
                                        {renderFillControl('Fill Color', '#e2e8f0')}
                                    </div>

                                    {(selectedElement.shapeType === 'rect' || !selectedElement.shapeType) && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium">Radius</label>
                                            <Input
                                                type="number"
                                                className="h-8 text-xs bg-background"
                                                min={0} max={100}
                                                value={selectedElement.cornerRadius || 0}
                                                onChange={(e) => updateAttr('cornerRadius', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Image Specific Sections */}
                    {selectedElement.type === 'image' && (
                        <AccordionItem value="image-appearance" className="border-none bg-muted/30 rounded-lg px-3">
                            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Tampilan</AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-4 pb-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-medium text-muted-foreground">Width</label>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs bg-background"
                                            value={Math.round(selectedElement.width || 0)}
                                            onChange={(e) => updateAttr('width', Math.max(10, parseInt(e.target.value) || 10))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-medium text-muted-foreground">Height</label>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs bg-background"
                                            value={Math.round(selectedElement.height || 0)}
                                            onChange={(e) => updateAttr('height', Math.max(10, parseInt(e.target.value) || 10))}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <label className="text-[10px] font-medium flex justify-between">
                                        <span>Radius Sudut</span>
                                        <span className="text-muted-foreground">{selectedElement.cornerRadius || 0}px</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={selectedElement.cornerRadius || 0}
                                        onChange={(e) => updateAttr('cornerRadius', parseInt(e.target.value) || 0)}
                                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                {/* AI Upscale Button */}
                                <div className="pt-4 mt-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full gap-2 text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                                        onClick={handleUpscale}
                                        disabled={isUpscaling}
                                    >
                                        {isUpscaling ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4" />
                                        )}
                                        {isUpscaling ? 'Meningkatkan...' : 'AI Tingkatkan Resolusi'}
                                    </Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Shared Effects Section (Text, Shapes, & Images) */}
                    {(selectedElement.type === 'text' || selectedElement.type === 'shape' || selectedElement.type === 'image') && (
                        <AccordionItem value="effects" className="border-none bg-muted/30 rounded-lg px-3">
                            <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-3">Efek</AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-5 pb-3">

                                {/* Stroke / Outline */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-xs font-medium">{selectedElement.type === 'text' ? 'Outline' : 'Border'}</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                                                <input
                                                    type="color"
                                                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                                    value={selectedElement.stroke || '#000000'}
                                                    onChange={(e) => updateAttr('stroke', e.target.value)}
                                                />
                                                <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                                    {(selectedElement.stroke || '#000000')}
                                                </span>
                                            </div>
                                            {renderBrandSwatches((c) => updateAttr('stroke', c))}
                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] justify-start px-0 text-muted-foreground mt-1" onClick={() => updateAttr('stroke', undefined)} disabled={!selectedElement.stroke}>
                                                Hapus
                                            </Button>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Input
                                                type="number"
                                                className="h-8 text-xs bg-background"
                                                min={0} max={20}
                                                value={selectedElement.strokeWidth || 0}
                                                onChange={(e) => updateAttr('strokeWidth', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full h-px bg-border/50" />

                                {/* Drop Shadow */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-xs font-medium">Bayangan</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 h-8 border rounded-md px-2 overflow-hidden bg-background">
                                                <input
                                                    type="color"
                                                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                                                    value={selectedElement.shadowColor || '#000000'}
                                                    onChange={(e) => updateAttr('shadowColor', e.target.value)}
                                                />
                                                <span className="text-[10px] uppercase font-mono tracking-tighter truncate">
                                                    {(selectedElement.shadowColor || '#000000')}
                                                </span>
                                            </div>
                                            {renderBrandSwatches((c) => updateAttr('shadowColor', c))}
                                            <Button variant="ghost" size="sm" className="h-5 text-[9px] justify-start px-0 text-muted-foreground mt-1" onClick={() => {
                                                updateAttr('shadowColor', undefined);
                                                updateAttr('shadowBlur', undefined);
                                                updateAttr('shadowOffsetX', undefined);
                                                updateAttr('shadowOffsetY', undefined);
                                            }} disabled={!selectedElement.shadowColor}>
                                                Hapus Bayangan
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-medium flex justify-between">
                                                <span className="text-muted-foreground">Radius Blur</span>
                                                <span>{selectedElement.shadowBlur || 0}</span>
                                            </label>
                                            <input type="range" min="0" max="50" step="1" value={selectedElement.shadowBlur || 0} onChange={(e) => updateAttr('shadowBlur', parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-medium flex justify-between">
                                                <span className="text-muted-foreground">Offset X</span>
                                                <span>{selectedElement.shadowOffsetX || 0}</span>
                                            </label>
                                            <input type="range" min="-20" max="20" step="1" value={selectedElement.shadowOffsetX || 0} onChange={(e) => updateAttr('shadowOffsetX', parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-medium flex justify-between">
                                                <span className="text-muted-foreground">Offset Y</span>
                                                <span>{selectedElement.shadowOffsetY || 0}</span>
                                            </label>
                                            <input type="range" min="-20" max="20" step="1" value={selectedElement.shadowOffsetY || 0} onChange={(e) => updateAttr('shadowOffsetY', parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                </Accordion>
            </div>
        </div>
    );
};

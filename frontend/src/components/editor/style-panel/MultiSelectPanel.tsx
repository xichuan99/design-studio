"use client";

import React from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { Button } from "@/components/ui/button";

function AlignBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
    return (
        <button
            className="flex items-center justify-center h-8 w-full border rounded text-[10px] font-medium hover:bg-muted transition-colors"
            title={title}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export function MultiSelectPanel() {
    const { elements, selectedElementIds, updateElement, deleteSelectedElements, duplicateSelectedElements, groupElements } = useCanvasStore();

    const selectedEls = elements.filter(el => selectedElementIds.includes(el.id));

    // Alignment logic
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

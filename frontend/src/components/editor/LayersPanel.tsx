"use client";

import React, { useState } from 'react';
import { useCanvasStore, CanvasElement } from '@/store/useCanvasStore';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Unlock, Image as ImageIcon, Square, Edit2, Layers, GripVertical, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableLayerItemProps {
    el: CanvasElement;
    isSelected: boolean;
    label: string;
    thumbnail: React.ReactNode;
    editingId: string | null;
    editName: string;
    setEditName: (name: string) => void;
    startEditing: (id: string, label: string) => void;
    handleSaveName: (id: string) => void;
    handleKeyDown: (e: React.KeyboardEvent, id: string) => void;
    toggleLock: (id: string) => void;
    toggleVisibility: (id: string) => void;
    selectElement: (id: string) => void;
    toggleSelectElement: (id: string) => void;
    setHighlightElementId: (id: string) => void;
    setColorTag: (id: string, color: string | null) => void;
    isSortable?: boolean;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
    el, isSelected, label, thumbnail, editingId, editName, setEditName,
    startEditing, handleSaveName, handleKeyDown, toggleLock, toggleVisibility,
    selectElement, toggleSelectElement, setHighlightElementId,
    setColorTag,
    isSortable = true
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: el.id, disabled: !isSortable });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={(e) => {
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    toggleSelectElement(el.id);
                } else {
                    selectElement(el.id);
                }
                setHighlightElementId(el.id);
            }}
            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-card hover:bg-muted'}`}
        >
            {isSortable ? (
                <div 
                    {...attributes} 
                    {...listeners}
                    className="cursor-grab hover:text-foreground text-muted-foreground p-1 -ml-1 rounded hover:bg-muted flex-shrink-0 outline-none"
                    title="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4 opacity-50" />
                </div>
            ) : (
                <div className="w-6 flex-shrink-0" />
            )}

            <div className="flex-shrink-0 relative group/picker">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div 
                            className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full border cursor-pointer opacity-0 group-hover/picker:opacity-100 transition-opacity z-10 hover:scale-110 shadow-sm"
                            style={{ backgroundColor: el.colorTag || '#e5e7eb', borderColor: 'var(--border)' }}
                            onClick={(e) => { e.stopPropagation(); }}
                            title="Set color tag"
                        />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={8}>
                        <div className="grid grid-cols-4 gap-1 p-1">
                            {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#64748b'].map(color => (
                                <div 
                                    key={color} 
                                    className="w-5 h-5 rounded-sm cursor-pointer border hover:scale-110 transition-transform" 
                                    style={{ backgroundColor: color }}
                                    onClick={(e) => { e.stopPropagation(); setColorTag(el.id, color); }}
                                />
                            ))}
                            <div 
                                className="w-5 h-5 rounded-sm cursor-pointer border flex items-center justify-center text-[10px] hover:bg-muted"
                                title="Clear color"
                                onClick={(e) => { e.stopPropagation(); setColorTag(el.id, null); }}
                            >
                                ✕
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div 
                    className="flex text-muted-foreground flex-shrink-0 border-l-2 pl-2 py-0.5 h-full items-center transition-colors"
                    style={{ borderLeftColor: el.colorTag || 'transparent' }}
                >
                    {thumbnail}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                {editingId === el.id ? (
                    <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveName(el.id)}
                        onKeyDown={(e) => handleKeyDown(e, el.id)}
                        className="h-6 text-xs px-1"
                    />
                ) : (
                    <div
                        className="text-xs truncate font-medium flex items-center gap-1 group"
                        onDoubleClick={() => startEditing(el.id, label)}
                    >
                        {label}
                        <Edit2
                            className="h-3 w-3 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); startEditing(el.id, label); }}
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${el.locked ? 'text-amber-500' : 'text-muted-foreground'}`}
                    onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                    title={el.locked ? "Unlock" : "Lock"}
                >
                    {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${el.visible === false ? 'text-muted-foreground opacity-50' : 'text-foreground'}`}
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                    title={el.visible === false ? "Show" : "Hide"}
                >
                    {el.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
            </div>
        </div>
    );
};

export const LayersPanel: React.FC = () => {
    const { elements, selectedElementIds, selectElement, toggleSelectElement, reorderElements, toggleVisibility, toggleLock, updateName, setHighlightElementId, setColorTag } = useCanvasStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const getLabel = (el: { label?: string; type: string; text?: string; shapeType?: string }) => {
        if (el.label) return el.label;
        if (el.type === 'group') return 'Group';
        if (el.type === 'text') return el.text ? `Text: ${el.text.substring(0, 10)}...` : 'Text';
        if (el.type === 'image') return 'Image';
        if (el.type === 'shape') return `Shape (${el.shapeType || 'rect'})`;
        return 'Element';
    };

    // Create a reversed copy for display since bottom-to-top means first-to-last in array
    const displayElements = [...elements]
        .reverse()
        .filter(el => {
            if (!searchQuery) return true;
            return getLabel(el).toLowerCase().includes(searchQuery.toLowerCase());
        });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = displayElements.findIndex((el) => el.id === active.id);
            const newIndex = displayElements.findIndex((el) => el.id === over.id);
            
            // Map the inverse index back to the real elements array index
            const fromOriginal = elements.length - 1 - oldIndex;
            const toOriginal = elements.length - 1 - newIndex;
            
            reorderElements(fromOriginal, toOriginal);
        }
    };

    const getThumbnail = (el: CanvasElement) => {
        if (el.type === 'image' && el.url) {
            return (
                <div className="w-6 h-6 rounded overflow-hidden bg-muted flex items-center justify-center border flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={el.url && el.url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(el.url)}` : el.url} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
            );
        }
        
        if (el.type === 'group') return <div className="w-6 h-6 rounded bg-muted/50 border flex items-center justify-center"><Layers className="h-3.5 w-3.5" /></div>;
        if (el.type === 'text') return <div className="w-6 h-6 rounded bg-muted border flex items-center justify-center font-serif font-bold text-xs">T</div>;
        if (el.type === 'image') return <div className="w-6 h-6 rounded bg-muted border flex items-center justify-center"><ImageIcon className="h-3.5 w-3.5" /></div>;
        
        if (el.type === 'shape') {
            return (
                <div className="w-6 h-6 rounded bg-muted border flex items-center justify-center">
                    {el.shapeType === 'circle' ? (
                        <div className="h-3 w-3 rounded-full border-2 border-current" style={{ backgroundColor: el.fill || 'transparent' }} />
                    ) : el.shapeType === 'line' ? (
                        <div className="h-0.5 w-4 bg-current transform rotate-45" />
                    ) : (
                         <div className="h-3 w-3 border-2 border-current" style={{ backgroundColor: el.fill || 'transparent' }} />
                    )}
                </div>
            );
        }
        return <Square className="h-4 w-4" />;
    };



    const startEditing = (id: string, currentLabel: string) => {
        setEditingId(id);
        setEditName(currentLabel);
    };

    const handleSaveName = (id: string) => {
        updateName(id, editName);
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') handleSaveName(id);
        if (e.key === 'Escape') setEditingId(null);
    };

    if (elements.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-card">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Layers className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium">Belum ada layer</p>
                <p className="text-xs opacity-70 mt-1">Tambahkan bentuk, teks, atau gambar...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-full overflow-hidden">
            <div className="p-2 border-b shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Cari layer..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 text-xs w-full bg-muted/50"
                    />
                </div>
            </div>
            <div className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={displayElements.map(el => el.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {displayElements.map((el) => {
                            const isGroup = el.type === 'group';
                            const children = isGroup ? elements.filter(child => child.parentId === el.id).reverse() : [];
                            
                            return (
                                <div key={`container-${el.id}`} className="mb-1">
                                    <SortableLayerItem
                                        key={el.id}
                                        el={el}
                                        isSelected={selectedElementIds.includes(el.id)}
                                        label={getLabel(el)}
                                        thumbnail={getThumbnail(el)}
                                        editingId={editingId}
                                        editName={editName}
                                        setEditName={setEditName}
                                        startEditing={startEditing}
                                        handleSaveName={handleSaveName}
                                        handleKeyDown={handleKeyDown}
                                        toggleLock={toggleLock}
                                        toggleVisibility={toggleVisibility}
                                        selectElement={selectElement}
                                        toggleSelectElement={toggleSelectElement}
                                        setHighlightElementId={setHighlightElementId}
                                        setColorTag={setColorTag}
                                        isSortable={!searchQuery}
                                    />
                                    {isGroup && children.length > 0 && (
                                        <div className="pl-6 border-l ml-3 my-1 space-y-1">
                                            {children.map(child => (
                                                <SortableLayerItem
                                                    key={child.id}
                                                    el={child}
                                                    isSelected={selectedElementIds.includes(child.id)}
                                                    label={getLabel(child)}
                                                    thumbnail={getThumbnail(child)}
                                                    editingId={editingId}
                                                    editName={editName}
                                                    setEditName={setEditName}
                                                    startEditing={startEditing}
                                                    handleSaveName={handleSaveName}
                                                    handleKeyDown={handleKeyDown}
                                                    toggleLock={toggleLock}
                                                    toggleVisibility={toggleVisibility}
                                                    selectElement={selectElement}
                                                    toggleSelectElement={toggleSelectElement}
                                                    setHighlightElementId={setHighlightElementId}
                                                    setColorTag={setColorTag}
                                                    isSortable={false}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

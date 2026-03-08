"use client";

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Image as ImageIcon, Save, Undo, Redo, Loader2, Download as DownloadIcon } from 'lucide-react';
import { ExportDialog } from './ExportDialog';

import { SaveStatus } from '@/hooks/useAutoSave';

interface ToolbarProps {
    projectId?: string;
    saveStatus?: SaveStatus;
    onSave?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ projectId, saveStatus = 'idle', onSave }) => {
    const { addElement, undo, redo, history, historyIndex, elements, backgroundUrl, backgroundColor, setBackgroundColor, stageRef, projectTitle } = useCanvasStore();
    const { saveProject, uploadImage } = useProjectApi();
    const [saving, setSaving] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    const handleAddText = () => {
        addElement({
            type: 'text',
            x: 300,
            y: 300,
            text: 'New Text',
            fontSize: 48,
            fontFamily: 'Inter',
            fill: '#000000',
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

    const handleSave = async () => {
        if (onSave) {
            onSave();
            return;
        }

        // Fallback to manual save if not provided (e.g. new project)
        setSaving(true);
        try {
            const payload = {
                title: projectTitle || 'Untitled Design',
                canvas_state: {
                    elements,
                    backgroundUrl,
                    backgroundColor,
                },
                status: 'draft',
                id: projectId,
            };
            await saveProject(payload);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save project. Check console.');
        } finally {
            setSaving(false);
        }
    };

    // Determine the save button content based on status
    const renderSaveContent = () => {
        if (saveStatus === 'saving' || (saveStatus === 'idle' && saving)) {
            return (
                <div className="flex flex-col items-center gap-1 group relative">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-[10px] text-primary">Saving</span>
                </div>
            );
        }
        if (saveStatus === 'saved') {
            return (
                <div className="flex flex-col items-center gap-1 group relative">
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[10px] text-green-500">Saved</span>
                </div>
            );
        }
        if (saveStatus === 'error') {
            return (
                <div className="flex flex-col items-center gap-1 group relative">
                    <Save className="h-5 w-5 text-red-500" />
                    <span className="text-[10px] text-red-500">Failed</span>
                </div>
            );
        }

        // idle or unsaved
        return (
            <div className="flex flex-col items-center gap-1 group relative">
                <Save className={`h-5 w-5 ${saveStatus === 'unsaved' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={`text-[10px] ${saveStatus === 'unsaved' ? 'text-primary' : 'text-muted-foreground'}`}>
                    {saveStatus === 'unsaved' ? 'Unsaved' : 'Save'}
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 p-4 border-r bg-card h-full w-20 items-center shrink-0">
            <Button variant="ghost" className="flex-col h-16 w-16 px-0" onClick={handleAddText}>
                <Plus className="h-6 w-6 mb-1" />
                <span className="text-[10px]">Text</span>
            </Button>

            <label className="flex flex-col items-center justify-center p-0 m-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <Button variant="ghost" className="flex-col h-16 w-16 px-0" asChild>
                    <div className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        <span className="text-[10px]">Image</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={saving}
                        />
                    </div>
                </Button>
            </label>

            {/* Canvas Background Color Picker */}
            <div className="flex flex-col items-center mt-2 group relative">
                <div className="h-8 w-8 rounded-full border shadow-sm overflow-hidden flex items-center justify-center cursor-pointer relative" title="Canvas Background Color">
                    <input
                        type="color"
                        value={backgroundColor || '#ffffff'}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="absolute inset-0 w-12 h-12 -top-2 -left-2 cursor-pointer p-0 bg-transparent"
                    />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">Canvas bg</span>
            </div>

            <div className="flex-1" />

            <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={historyIndex === 0}
            >
                <Undo className="h-5 w-5" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
            >
                <Redo className="h-5 w-5" />
            </Button>

            <Button
                variant="ghost"
                className="flex-col h-16 w-16 px-0 mt-2"
                onClick={() => setExportOpen(true)}
                disabled={!stageRef}
            >
                <DownloadIcon className="h-6 w-6 mb-1" />
                <span className="text-[10px]">Export</span>
            </Button>

            <Button
                variant="default"
                className="flex-col h-16 w-16 px-0 mt-2 rounded-xl"
                onClick={handleSave}
                disabled={saveStatus === 'saving' || saving}
                title="Save Project"
            >
                {renderSaveContent()}
            </Button>

            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                title={projectId ? "Smart_Design_Project" : "Untitled_Design"}
            />
        </div>
    );
};

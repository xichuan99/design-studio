"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Download as DownloadIcon, Save, Loader2, ChevronLeft } from 'lucide-react';
import { ExportDialog } from './ExportDialog';
import { SaveStatus } from '@/hooks/useAutoSave';
import Link from 'next/link';

interface EditorTopBarProps {
    projectId?: string;
    saveStatus?: SaveStatus;
    onSave?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({ projectId, saveStatus = 'idle', onSave }) => {
    const { undo, redo, history, historyIndex, elements, backgroundUrl, backgroundColor, stageRef, projectTitle, setProjectTitle } = useCanvasStore();
    const { saveProject } = useProjectApi();
    const [saving, setSaving] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    // Title Editor State
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(projectTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempTitle(projectTitle);
    }, [projectTitle]);

    const handleSaveTitle = () => {
        setIsEditingTitle(false);
        if (tempTitle.trim()) {
            setProjectTitle(tempTitle.trim());
        } else {
            setTempTitle(projectTitle);
        }
    };

    const handleSaveProject = async () => {
        if (onSave) {
            onSave();
            return;
        }

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
            alert('Failed to save project.');
        } finally {
            setSaving(false);
        }
    };

    const renderSaveContent = () => {
        if (saveStatus === 'saving' || (saveStatus === 'idle' && saving)) {
            return (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Saving...</span>
                </div>
            );
        }
        if (saveStatus === 'saved') {
            return (
                <div className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            );
        }
        if (saveStatus === 'error') {
            return (
                <div className="flex items-center gap-1">
                    <Save className="h-4 w-4 text-red-500" />
                </div>
            );
        }

        return (
            <div className="flex items-center gap-1 group cursor-pointer" onClick={handleSaveProject}>
                <Save className={`h-4 w-4 ${saveStatus === 'unsaved' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
            </div>
        );
    };

    return (
        <div className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0 shadow-sm z-40">
            {/* Left section: Back button & Title */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
                    <Link href="/projects">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>

                <div className="flex items-center gap-3">
                    {isEditingTitle ? (
                        <input
                            ref={inputRef}
                            type="text"
                            autoFocus
                            className="font-jakarta font-semibold text-base bg-transparent border-b border-primary outline-none px-1 py-0.5 w-64"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') {
                                    setIsEditingTitle(false);
                                    setTempTitle(projectTitle);
                                }
                            }}
                        />
                    ) : (
                        <h1
                            className="font-jakarta font-semibold text-base cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors truncate max-w-xs"
                            onClick={() => setIsEditingTitle(true)}
                            title="Click to rename project"
                        >
                            {projectTitle || "Untitled Design"}
                        </h1>
                    )}
                </div>
            </div>

            {/* Right section: History, Save status, Export */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2 border-r pr-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={historyIndex === 0} title="Undo (Ctrl+Z)">
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)">
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-3 mr-2 px-2" title="Save Status">
                    {renderSaveContent()}
                </div>

                <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => setExportOpen(true)}
                    disabled={!stageRef}
                >
                    <DownloadIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                </Button>

                <ExportDialog
                    open={exportOpen}
                    onOpenChange={setExportOpen}
                    title={projectTitle || (projectId ? "Smart_Design_Project" : "Untitled_Design")}
                />
            </div>
        </div>
    );
};

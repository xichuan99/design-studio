"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Download as DownloadIcon, Loader2, ChevronLeft, Cloud, CloudAlert, Check, Keyboard, Info } from 'lucide-react';
import { ExportDialog } from './ExportDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SaveStatus } from '@/hooks/useAutoSave';
import { toast } from 'sonner';
import Link from 'next/link';

interface EditorTopBarProps {
    projectId?: string;
    saveStatus?: SaveStatus;
    onSave?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({ projectId, saveStatus = 'idle', onSave }) => {
    const { undo, redo, history, historyIndex, elements, backgroundUrl, backgroundColor, stageRef, projectTitle, setProjectTitle, originalPrompt } = useCanvasStore();
    const { saveProject } = useProjectApi();
    const [saving, setSaving] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
            toast.error('Gagal menyimpan proyek.');
        } finally {
            setSaving(false);
        }
    };

    const renderSaveContent = () => {
        if (saveStatus === 'saving' || (saveStatus === 'idle' && saving)) {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 cursor-default">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline-block">Menyimpan...</span>
                </div>
            );
        }
        if (saveStatus === 'saved') {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-green-600/80 cursor-default animation-fade-in transition-all">
                    <div className="relative flex items-center justify-center">
                        <Cloud className="h-4 w-4" />
                        <Check className="h-2 w-2 absolute mt-0.5 text-background font-bold drop-shadow-sm" strokeWidth={4} />
                    </div>
                    <span className="text-xs font-medium hidden sm:inline-block">Tersimpan</span>
                </div>
            );
        }
        if (saveStatus === 'error') {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-destructive bg-destructive/10 cursor-default">
                    <CloudAlert className="h-4 w-4" />
                    <span className="text-xs font-medium hidden sm:inline-block">Gagal menyimpan</span>
                </div>
            );
        }
        if (saveStatus === 'unsaved') {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full group cursor-pointer hover:bg-muted" onClick={handleSaveProject}>
                    <div className="relative flex h-2 w-2 mt-0.5 mr-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors hidden sm:inline-block">Perubahan belum tersimpan</span>
                </div>
            );
        }

        // Idle and pristine state
        return null;
    };

    return (
        <div className="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-background/80 backdrop-blur-xl shrink-0 z-40 relative">
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
                    {originalPrompt && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary transition-colors">
                                    <Info className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80 max-h-64 overflow-y-auto z-50 p-4 shadow-xl">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-foreground">Prompt Generasi AI</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {originalPrompt}
                                    </p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {/* Right section: History, Save status, Export */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2 border-r pr-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShortcutsOpen(true)} title="Keyboard Shortcuts">
                        <Keyboard className="h-4 w-4" />
                    </Button>
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
                    className="gap-2 shadow-[0_0_15px_rgba(var(--primary),0.2)] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                    onClick={() => setExportOpen(true)}
                    disabled={!stageRef}
                >
                    <DownloadIcon className="h-4 w-4 drop-shadow-sm" />
                    <span className="hidden sm:inline font-semibold">Export</span>
                </Button>

                <ExportDialog
                    open={exportOpen}
                    onOpenChange={setExportOpen}
                    title={projectTitle || (projectId ? "Smart_Design_Project" : "Untitled_Design")}
                />
                <KeyboardShortcutsDialog
                    open={shortcutsOpen}
                    onOpenChange={setShortcutsOpen}
                />
            </div>
        </div>
    );
};

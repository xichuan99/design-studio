"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import WebFont from 'webfontloader';

import { Plus, Undo as UndoIcon, Redo as RedoIcon } from 'lucide-react';
import { Toolbar } from "@/components/editor/Toolbar";
import { CanvasWorkspace } from "@/components/editor/CanvasWorkspace";
import { StylePanel } from "@/components/editor/StylePanel";
import { useProjectApi } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AppHeader } from "@/components/layout/AppHeader";
import { HistoryPanel } from "@/components/editor/HistoryPanel";

const PRELOAD_FONTS = ['Inter', 'Poppins', 'Roboto', 'Playfair Display', 'Montserrat', 'Oswald'];

export default function EditorPage() {
    const { projectId } = useParams();
    const { status } = useSession();
    const { getProject } = useProjectApi();
    const { loadState } = useCanvasStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize auto-save hook
    const { saveStatus, forceSave } = useAutoSave(projectId as string | undefined);

    // Preload Google Fonts
    useEffect(() => {
        try {
            WebFont.load({
                google: {
                    families: PRELOAD_FONTS,
                },
            });
        } catch (e) {
            console.warn('WebFont loading failed:', e);
        }
    }, []);

    // Use refs to stabilize function references and prevent infinite re-fetch loop
    const getProjectRef = useRef(getProject);
    getProjectRef.current = getProject;
    const loadStateRef = useRef(loadState);
    loadStateRef.current = loadState;

    useEffect(() => {
        if (status === "loading") return;

        const loadProject = async () => {
            if (!projectId) {
                loadStateRef.current([], null);
                setLoading(false);
                return;
            }

            try {
                const project = await getProjectRef.current(projectId as string);
                if (project.canvas_state) {
                    loadStateRef.current(
                        project.canvas_state.elements || [],
                        project.canvas_state.backgroundUrl || null,
                        project.title,
                        project.canvas_state.backgroundColor
                    );
                } else {
                    loadStateRef.current([], null, project.title);
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load project.");
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [status, projectId]);

    if (loading || status === "loading") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Loading Project...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <p className="text-red-500 font-medium">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <AppHeader />

            {/* Editor Top Bar with Title */}
            <div className="h-12 border-b flex items-center px-4 bg-card shrink-0 shadow-sm z-40">
                <TitleEditor />
            </div>

            {/* Desktop layout: Toolbar | Canvas | StylePanel */}
            {/* Mobile layout: Stack vertically, hide StylePanel if screen too small */}
            <main className="flex flex-1 overflow-hidden relative">
                {/* Toolbar — hidden on very small screens */}
                <div className="hidden sm:flex">
                    <Toolbar
                        projectId={projectId as string | undefined}
                        saveStatus={saveStatus}
                        onSave={forceSave}
                    />
                </div>

                <CanvasWorkspace />

                {/* Right Sidebar: StylePanel + HistoryPanel */}
                <div className="hidden md:flex flex-col border-l bg-card overflow-y-auto" style={{ width: 280 }}>
                    <StylePanel />
                    {projectId && (
                        <div className="border-t">
                            <HistoryPanel projectId={projectId as string} />
                        </div>
                    )}
                </div>
            </main>

            {/* Mobile bottom bar */}
            <div className="sm:hidden flex items-center justify-around border-t bg-card p-2">
                <MobileToolbarActions />
            </div>
        </div>
    );
}

// Inline Title Editor
function TitleEditor() {
    const { projectTitle, setProjectTitle } = useCanvasStore();
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(projectTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync tempTitle when projectTitle changes externally (e.g., loaded)
    useEffect(() => {
        setTempTitle(projectTitle);
    }, [projectTitle]);

    const handleSave = () => {
        setIsEditing(false);
        if (tempTitle.trim()) {
            setProjectTitle(tempTitle.trim());
        } else {
            setTempTitle(projectTitle); // Revert if empty
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                autoFocus
                className="font-jakarta font-bold text-lg bg-transparent border-b border-primary outline-none px-1 py-0.5 w-64"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                        setIsEditing(false);
                        setTempTitle(projectTitle);
                    }
                }}
            />
        );
    }

    return (
        <h1
            className="font-jakarta font-bold text-lg cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors truncate max-w-xs"
            onClick={() => setIsEditing(true)}
            title="Click to rename project"
        >
            {projectTitle || "Untitled Design"}
        </h1>
    );
}

// Simplified mobile toolbar actions
function MobileToolbarActions() {
    const { addElement, undo, redo } = useCanvasStore();

    return (
        <>
            <button className="p-2" onClick={() => addElement({ type: 'text', x: 100, y: 100, text: 'Text', fontSize: 36, fontFamily: 'Inter', fill: '#000', rotation: 0 })}>
                <Plus className="h-5 w-5" />
            </button>
            <button className="p-2" onClick={undo}><UndoIcon className="h-5 w-5" /></button>
            <button className="p-2" onClick={redo}><RedoIcon className="h-5 w-5" /></button>
        </>
    );
}

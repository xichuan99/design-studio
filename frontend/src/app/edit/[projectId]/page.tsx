"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import WebFont from 'webfontloader';

import { Plus, Undo as UndoIcon, Redo as RedoIcon } from 'lucide-react';
import { Toolbar } from "@/components/editor/Toolbar";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { CanvasWorkspace } from "@/components/editor/CanvasWorkspace";
import { StylePanel } from "@/components/editor/StylePanel";
import { useProjectApi } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { HistoryPanel } from "@/components/editor/HistoryPanel";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { AIPromptPanel } from "@/components/editor/AIPromptPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, SlidersHorizontal, History as HistoryIcon, Sparkles } from "lucide-react";

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
            {/* Editor Top Bar */}
            <EditorTopBar
                projectId={projectId as string | undefined}
                saveStatus={saveStatus}
                onSave={forceSave}
            />

            {/* Desktop layout: Toolbar | Canvas | StylePanel */}
            {/* Mobile layout: Stack vertically, hide StylePanel if screen too small */}
            <main className="flex flex-1 overflow-hidden relative">
                {/* Toolbar — hidden on very small screens */}
                <div className="hidden sm:flex">
                    <Toolbar
                        projectId={projectId as string | undefined}
                    />
                </div>

                <CanvasWorkspace />

                {/* Right Sidebar: Tabs for Props, Layers, History */}
                <div className="hidden md:flex flex-col border-l bg-card overflow-hidden" style={{ width: 280 }}>
                    <Tabs defaultValue="properties" className="w-[280px] flex flex-col h-full border-none">
                        <TabsList className="grid w-full grid-cols-4 rounded-none border-b bg-transparent h-12 p-0">
                            <TabsTrigger value="properties" className="rounded-none data-[state=active]:bg-muted/50 data-[state=active]:border-b-2 border-primary h-full">
                                <SlidersHorizontal className="h-4 w-4 lg:mr-1" /> <span className="hidden lg:inline">Props</span>
                            </TabsTrigger>
                            <TabsTrigger value="layers" className="rounded-none data-[state=active]:bg-muted/50 data-[state=active]:border-b-2 border-primary h-full">
                                <Layers className="h-4 w-4 lg:mr-1" /> <span className="hidden lg:inline">Layers</span>
                            </TabsTrigger>
                            <TabsTrigger value="ai" className="rounded-none data-[state=active]:bg-muted/50 data-[state=active]:border-b-2 border-primary h-full">
                                <Sparkles className="h-4 w-4 lg:mr-1" /> <span className="hidden lg:inline">AI</span>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-none data-[state=active]:bg-muted/50 data-[state=active]:border-b-2 border-primary h-full relative" disabled={!projectId} title="History">
                                <HistoryIcon className="h-4 w-4" />
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="properties" className="mt-0 flex-1 overflow-y-auto">
                            <StylePanel />
                        </TabsContent>

                        <TabsContent value="layers" className="mt-0 flex-1 overflow-y-auto">
                            <LayersPanel />
                        </TabsContent>

                        <TabsContent value="ai" className="mt-0 flex-1 overflow-y-auto">
                            <AIPromptPanel />
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto">
                            {projectId && <HistoryPanel projectId={projectId as string} />}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Mobile bottom bar */}
            <div className="sm:hidden flex items-center justify-around border-t bg-card p-2">
                <MobileToolbarActions />
            </div>
        </div>
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

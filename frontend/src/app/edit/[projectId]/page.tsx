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

    const [loadingStage, setLoadingStage] = useState<'project' | 'image' | 'ready' | 'error'>('project');
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
    const loadStateRef = useRef(loadState);
    useEffect(() => {
        getProjectRef.current = getProject;
        loadStateRef.current = loadState;
    });

    useEffect(() => {
        if (status === "loading") return;

        const loadProject = async () => {
            if (!projectId) {
                loadStateRef.current([], null);
                setLoadingStage('ready');
                return;
            }

            try {
                setLoadingStage('project');
                const project = await getProjectRef.current(projectId as string);

                if (project.canvas_state) {
                    loadStateRef.current(
                        project.canvas_state.elements || [],
                        project.canvas_state.backgroundUrl || null,
                        project.title,
                        project.canvas_state.backgroundColor
                    );

                    if (project.canvas_state.backgroundUrl) {
                        setLoadingStage('image');
                        // Preload image, then mark ready
                        const img = new window.Image();
                        img.crossOrigin = 'anonymous';
                        const proxyUrl = project.canvas_state.backgroundUrl.startsWith('http')
                            ? `/api/proxy-image?url=${encodeURIComponent(project.canvas_state.backgroundUrl)}`
                            : project.canvas_state.backgroundUrl;
                        img.src = proxyUrl;
                        await Promise.race([
                            new Promise(r => { img.onload = r; img.onerror = r; }),
                            new Promise(r => setTimeout(r, 5000))
                        ]);
                    }
                } else {
                    loadStateRef.current([], null, project.title);
                }
                setLoadingStage('ready');
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load project.");
                setLoadingStage('error');
            }
        };

        loadProject();
    }, [status, projectId]);

    if ((loadingStage !== 'ready' && loadingStage !== 'error') || status === "loading") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6 text-muted-foreground bg-card p-10 rounded-2xl shadow-xl border">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="space-y-3 w-56">
                        <StageIndicator label="Memuat project..." done={loadingStage !== 'project'} active={loadingStage === 'project'} />
                        <StageIndicator label="Memuat gambar..." done={loadingStage === 'ready'} active={loadingStage === 'image'} />
                        <StageIndicator label="Menyiapkan canvas..." done={false} active={loadingStage === 'ready'} />
                    </div>
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

// Helper component for loading screen
function StageIndicator({ label, done, active }: { label: string, done: boolean, active: boolean }) {
    return (
        <div className={`flex items-center gap-3 text-sm transition-all duration-300 ${active ? 'text-primary font-medium scale-105' : done ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? 'bg-primary animate-pulse' : done ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
            <span>{label}</span>
            {done && <span className="ml-auto text-primary">✓</span>}
        </div>
    );
}

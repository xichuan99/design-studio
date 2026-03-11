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
import { AIAssetsPanel } from "@/components/editor/AIAssetsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, SlidersHorizontal, History as HistoryIcon, Sparkles, Image as ImageIcon } from "lucide-react";

const PRELOAD_FONTS = ['Inter', 'Poppins', 'Roboto', 'Playfair Display', 'Montserrat', 'Oswald'];

export default function EditorPage() {
    const { projectId } = useParams();
    const { status } = useSession();
    const { getProject } = useProjectApi();
    const { loadState } = useCanvasStore();

    const [loadingStage, setLoadingStage] = useState<'project' | 'image' | 'ready' | 'error'>('project');
    const [canvasBgReady, setCanvasBgReady] = useState(false);
    const hasBackgroundRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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

    // Callback from CanvasWorkspace when background image finishes loading
    const handleBgStatusChange = (bgStatus: string) => {
        if (bgStatus === 'loaded' || bgStatus === 'failed') {
            setCanvasBgReady(true);
            // Transition loading stage directly from callback
            setLoadingStage(prev => prev === 'image' ? 'ready' : prev);
        }
    };

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
                    const hasBg = !!project.canvas_state.backgroundUrl;
                    hasBackgroundRef.current = hasBg;

                    loadStateRef.current(
                        project.canvas_state.elements || [],
                        project.canvas_state.backgroundUrl || null,
                        project.title,
                        project.canvas_state.backgroundColor
                    );

                    if (hasBg) {
                        setLoadingStage('image');
                        // Don't mark ready here — the canvas will report when the image is actually rendered
                    } else {
                        setCanvasBgReady(true); // No background to wait for
                        setLoadingStage('ready');
                    }
                } else {
                    loadStateRef.current([], null, project.title);
                    setCanvasBgReady(true);
                    setLoadingStage('ready');
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load project.");
                setLoadingStage('error');
            }
        };

        loadProject();
    }, [status, projectId]);

    // Safety timeout: if image takes more than 8 seconds, proceed anyway
    useEffect(() => {
        if (loadingStage === 'image') {
            const timeout = setTimeout(() => {
                setLoadingStage('ready');
            }, 8000);
            return () => clearTimeout(timeout);
        }
    }, [loadingStage]);

    const isLoading = (loadingStage !== 'ready' && loadingStage !== 'error') || status === "loading";

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <p className="text-red-500 font-medium">Error: {error}</p>
            </div>
        );
    }

    // Show loading screen only when project data hasn't loaded yet
    if (loadingStage === 'project' || status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6 text-muted-foreground bg-card p-10 rounded-2xl shadow-xl border">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="space-y-3 w-56">
                        <StageIndicator label="Memuat project..." done={false} active={true} />
                        <StageIndicator label="Memuat gambar..." done={false} active={false} />
                        <StageIndicator label="Menyiapkan canvas..." done={false} active={false} />
                    </div>
                </div>
            </div>
        );
    }

    // Once project data is loaded, render the full editor.
    // If image is still loading, show overlay on top of the editor (editor is mounted but hidden behind overlay).
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

                <CanvasWorkspace onBgStatusChange={handleBgStatusChange} />

                {/* Mobile Right Sidebar Backdrop */}
                {mobilePanelOpen && (
                    <div 
                        className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
                        onClick={() => setMobilePanelOpen(false)}
                        aria-hidden="true"
                    />
                )}

                {/* Right Sidebar: Tabs for Props, Layers, History */}
                <div className={`
                    fixed md:relative right-0 top-14 bottom-[57px] md:bottom-0 md:top-0 z-40 md:z-auto
                    w-[85vw] max-w-[320px] md:w-[280px]
                    flex flex-col border-l border-border/40 bg-background/80 backdrop-blur-xl overflow-hidden shadow-2xl md:shadow-none
                    transition-transform duration-300 transform
                    ${mobilePanelOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <Tabs defaultValue="properties" className="w-full flex flex-col h-full border-none">
                        <TabsList className="grid w-full grid-cols-5 rounded-none border-b border-border/40 bg-transparent h-12 p-0">
                            <TabsTrigger value="properties" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-1" title="Properties">
                                <SlidersHorizontal className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline text-xs font-semibold">Props</span>
                            </TabsTrigger>
                            <TabsTrigger value="layers" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-1" title="Layers">
                                <Layers className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline text-xs font-semibold">Layers</span>
                            </TabsTrigger>
                            <TabsTrigger value="ai" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-1" title="Generate AI">
                                <Sparkles className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline text-xs font-semibold">AI</span>
                            </TabsTrigger>
                            <TabsTrigger value="assets" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-1" title="Aset/Galeri">
                                <ImageIcon className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline text-xs font-semibold">Aset</span>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full relative" disabled={!projectId} title="History">
                                <HistoryIcon className="h-4 w-4" />
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="properties" className="mt-0 flex-1 overflow-y-auto w-full">
                            <StylePanel />
                        </TabsContent>

                        <TabsContent value="layers" className="mt-0 flex-1 overflow-y-auto w-full">
                            <LayersPanel />
                        </TabsContent>

                        <TabsContent value="ai" className="mt-0 flex-1 overflow-y-auto w-full">
                            <AIPromptPanel />
                        </TabsContent>

                        <TabsContent value="assets" className="mt-0 flex-1 overflow-y-auto w-full">
                            <AIAssetsPanel />
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto w-full">
                            {projectId && <HistoryPanel projectId={projectId as string} />}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Mobile bottom bar */}
            <div className="md:hidden flex items-center justify-around border-t bg-card h-[57px] shrink-0 pb-safe">
                <MobileToolbarActions togglePanel={() => setMobilePanelOpen(!mobilePanelOpen)} isPanelOpen={mobilePanelOpen} />
            </div>

            {/* Loading overlay — fades out when image is ready */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500">
                    <div className="flex flex-col items-center gap-6 text-muted-foreground bg-card p-10 rounded-2xl shadow-xl border">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="space-y-3 w-56">
                            <StageIndicator label="Memuat project..." done={true} active={false} />
                            <StageIndicator label="Memuat gambar..." done={canvasBgReady} active={loadingStage === 'image'} />
                            <StageIndicator label="Menyiapkan canvas..." done={false} active={loadingStage === 'ready'} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simplified mobile toolbar actions with expanded features
function MobileToolbarActions({ togglePanel, isPanelOpen }: { togglePanel: () => void, isPanelOpen: boolean }) {
    const { addElement, undo, redo } = useCanvasStore();

    return (
        <div className="flex w-full justify-evenly items-center px-2 py-1">
            <button className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => addElement({ type: 'text', x: 50, y: 50, text: 'Text', fontSize: 36, fontFamily: 'Inter', fill: '#000', rotation: 0 })}>
                <Plus className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Text</span>
            </button>
            <button className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => addElement({ type: 'shape', shapeType: 'rect', x: 50, y: 50, width: 100, height: 100, fill: '#e2e8f0', stroke: '#0f172a', strokeWidth: 0, rotation: 0 })}>
                <div className="w-4 h-4 border-2 border-current rounded-sm mb-1" />
                <span className="text-[9px]">Shape</span>
            </button>
            
            <div className="w-px h-8 bg-border mx-1" />

            <button className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" onClick={undo}>
                <UndoIcon className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Undo</span>
            </button>
            <button className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" onClick={redo}>
                <RedoIcon className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Redo</span>
            </button>

            <div className="w-px h-8 bg-border mx-1" />

            <button 
                className={`flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors ${isPanelOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`} 
                onClick={togglePanel}
            >
                <SlidersHorizontal className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Settings</span>
            </button>
        </div>
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

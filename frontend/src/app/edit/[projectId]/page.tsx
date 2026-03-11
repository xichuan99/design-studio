"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import WebFont from 'webfontloader';

import { Undo as UndoIcon, Redo as RedoIcon } from 'lucide-react';
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { CanvasWorkspace } from "@/components/editor/CanvasWorkspace";
import { StylePanel } from "@/components/editor/StylePanel";
import { useProjectApi } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { HistoryPanel } from "@/components/editor/HistoryPanel";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { LeftSidebar } from "@/components/editor/LeftSidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, SlidersHorizontal, History as HistoryIcon, PanelLeft, PanelRight } from "lucide-react";

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
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [leftPanelOpen, setLeftPanelOpen] = useState(false);

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

                    // Support dynamic aspect ratios
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const ar = (project as any).aspect_ratio || '1:1';
                    type Dimensions = [number, number];
                    const dims: Record<string, Dimensions> = { '1:1': [1080, 1080], '9:16': [1080, 1920], '16:9': [1920, 1080] };
                    const [w, h] = dims[ar] || [1080, 1080];
                    useCanvasStore.getState().setCanvasDimensions(w, h);

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

            {/* Desktop layout: LeftSidebar (creation) | Canvas | RightSidebar (editing) */}
            {/* Mobile layout: Stack vertically, sidebars are slide-ins */}
            <main className="flex flex-1 overflow-hidden relative">
                
                {/* Left Sidebar (AI & Tools) - Hidden on mobile by default */}
                <div className={`
                    fixed md:relative left-0 top-14 bottom-[57px] md:bottom-0 md:top-0 z-40 md:z-auto
                    h-full transition-transform duration-300 transform
                    ${leftPanelOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <LeftSidebar />
                </div>

                <CanvasWorkspace onBgStatusChange={handleBgStatusChange} />

                {/* Mobile Sidebar Backdrops */}
                {(rightPanelOpen || leftPanelOpen) && (
                    <div 
                        className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
                        onClick={() => {
                            setRightPanelOpen(false);
                            setLeftPanelOpen(false);
                        }}
                        aria-hidden="true"
                    />
                )}

                {/* Right Sidebar: Tabs for Props, Layers, History */}
                <div className={`
                    fixed md:relative right-0 top-14 bottom-[57px] md:bottom-0 md:top-0 z-40 md:z-auto
                    w-[85vw] max-w-[320px] md:w-[280px]
                    flex flex-col border-l border-border/40 bg-background/80 backdrop-blur-xl overflow-hidden shadow-2xl md:shadow-none
                    transition-transform duration-300 transform
                    ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <Tabs defaultValue="properties" className="w-full flex flex-col h-full border-none">
                            <TabsList className="flex w-full overflow-x-auto no-scrollbar rounded-none border-b border-border/40 bg-transparent h-12 p-0 items-center justify-evenly shrink-0">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="properties" className="flex-1 rounded-none hover:bg-muted/50 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-4" title="Properties">
                                            <SlidersHorizontal className="h-[18px] w-[18px]" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">Props</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="layers" className="flex-1 rounded-none hover:bg-muted/50 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-4" title="Layers">
                                            <Layers className="h-[18px] w-[18px]" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">Layers</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="history" className="flex-1 rounded-none hover:bg-muted/50 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all duration-300 h-full px-4" disabled={!projectId} title="History">
                                            <HistoryIcon className="h-[18px] w-[18px]" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">History</TooltipContent>
                                </Tooltip>
                            </TabsList>

                        <TabsContent value="properties" className="mt-0 flex-1 overflow-y-auto w-full">
                            <StylePanel />
                        </TabsContent>

                        <TabsContent value="layers" className="mt-0 flex-1 overflow-y-auto w-full">
                            <LayersPanel />
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto w-full">
                            {projectId && <HistoryPanel projectId={projectId as string} />}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Mobile bottom bar */}
            <div className="md:hidden flex items-center justify-around border-t bg-card h-[57px] shrink-0 pb-safe z-50 relative">
                <MobileToolbarActions 
                    toggleLeftPanel={() => { setLeftPanelOpen(!leftPanelOpen); setRightPanelOpen(false); }}
                    isLeftOpen={leftPanelOpen}
                    toggleRightPanel={() => { setRightPanelOpen(!rightPanelOpen); setLeftPanelOpen(false); }}
                    isRightOpen={rightPanelOpen} 
                />
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
function MobileToolbarActions({ 
    toggleLeftPanel, isLeftOpen,
    toggleRightPanel, isRightOpen 
}: { 
    toggleLeftPanel: () => void, isLeftOpen: boolean,
    toggleRightPanel: () => void, isRightOpen: boolean 
}) {
    const { undo, redo } = useCanvasStore();

    return (
        <div className="flex w-full justify-evenly items-center px-2 py-1">
            <button 
                className={`flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors w-16 ${isLeftOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`} 
                onClick={toggleLeftPanel}
            >
                <PanelLeft className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Tools & AI</span>
            </button>
            
            <div className="w-px h-8 bg-border mx-1" />

            <button className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground w-14" onClick={undo}>
                <UndoIcon className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Undo</span>
            </button>
            <button className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground w-14" onClick={redo}>
                <RedoIcon className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Redo</span>
            </button>

            <div className="w-px h-8 bg-border mx-1" />

            <button 
                className={`flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors w-16 ${isRightOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`} 
                onClick={toggleRightPanel}
            >
                <PanelRight className="h-5 w-5 mb-0.5" />
                <span className="text-[9px]">Properties</span>
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

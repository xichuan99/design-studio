"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { FolderSidebar } from "@/components/projects/FolderSidebar";
import { AssetGrid } from "@/components/assets/AssetGrid";
import { ProjectGrid } from "@/components/library/ProjectGrid";
import { Suspense } from "react";

const DEFAULT_TAB = "projects";
const DEFAULT_PROJECT_SORT = "newest";
const DEFAULT_ASSET_TAB = "tools";

type ProjectSort = "newest" | "oldest" | "a-z" | "z-a";
type AssetTab = "tools" | "generations";

export default function LibraryPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-background">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            }
        >
            <LibraryPageContent />
        </Suspense>
    );
}

function LibraryPageContent() {
    const { status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    const tab = useMemo(() => {
        const value = searchParams.get("tab");
        return value === "assets" ? "assets" : DEFAULT_TAB;
    }, [searchParams]);

    const projectSearch = useMemo(() => searchParams.get("search") || "", [searchParams]);
    const projectSort = useMemo<ProjectSort>(() => {
        const value = searchParams.get("sort");
        return value === "oldest" || value === "a-z" || value === "z-a" ? value : DEFAULT_PROJECT_SORT;
    }, [searchParams]);
    const assetTab = useMemo<AssetTab>(() => {
        const value = searchParams.get("asset_tab");
        return value === "generations" ? "generations" : DEFAULT_ASSET_TAB;
    }, [searchParams]);
    const relatedProjectId = useMemo(() => searchParams.get("project_id"), [searchParams]);
    const selectedFolderId = useMemo(() => searchParams.get("folder_id"), [searchParams]);

    const replaceWithParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (!value) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        router.replace(`/library?${params.toString()}`);
    };

    const onTabChange = (value: string) => {
        replaceWithParams({
            tab: value === "assets" ? "assets" : DEFAULT_TAB,
            project_id: value === "assets" ? relatedProjectId : null,
        });
    };

    const handleSelectFolder = (folderId: string | null) => {
        replaceWithParams({ folder_id: folderId });
    };

    const handleOpenRelatedAssets = (projectId: string) => {
        replaceWithParams({
            tab: "assets",
            asset_tab: "generations",
            project_id: projectId,
        });
    };

    const clearProjectFilter = () => {
        replaceWithParams({ project_id: null });
    };

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <main className="flex-1 max-w-[1600px] w-full mx-auto flex">
                <aside className="hidden md:block w-64 shrink-0 border-r border-border/50 p-6">
                    <FolderSidebar selectedFolderId={selectedFolderId} onSelectFolder={handleSelectFolder} />
                </aside>

                <section className="flex-1 p-6 md:p-8 space-y-6 min-w-0">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">Library</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">
                            Kelola project dan aset AI dalam satu workspace.
                        </p>
                    </div>

                    <Tabs value={tab} onValueChange={onTabChange} className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="projects" className="min-w-28">Projects</TabsTrigger>
                            <TabsTrigger value="assets" className="min-w-28">Assets</TabsTrigger>
                        </TabsList>

                        <TabsContent value="projects" className="space-y-4">
                            <ProjectGrid
                                selectedFolderId={selectedFolderId}
                                searchQuery={projectSearch}
                                sortBy={projectSort}
                                onSearchChange={(value) => replaceWithParams({ search: value || null })}
                                onSortChange={(value) => replaceWithParams({ sort: value === DEFAULT_PROJECT_SORT ? null : value })}
                                onOpenRelatedAssets={handleOpenRelatedAssets}
                            />
                        </TabsContent>

                        <TabsContent value="assets" className="space-y-4">
                            <AssetGrid
                                selectedFolderId={selectedFolderId}
                                initialTab={assetTab}
                                projectFilterId={relatedProjectId}
                                onClearProjectFilter={clearProjectFilter}
                            />
                        </TabsContent>
                    </Tabs>
                </section>
            </main>
        </div>
    );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProjectApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Layers, Loader2, Plus, Search, X } from "lucide-react";

interface Project {
    id: string;
    title: string;
    updated_at: string;
    aspect_ratio?: string;
    canvas_state?: { backgroundUrl?: string; elements?: Record<string, unknown>[] };
}

type ProjectSort = "newest" | "oldest" | "a-z" | "z-a";

interface ProjectGridProps {
    selectedFolderId: string | null;
    searchQuery: string;
    sortBy: ProjectSort;
    onSearchChange: (value: string) => void;
    onSortChange: (value: ProjectSort) => void;
    onOpenRelatedAssets?: (projectId: string) => void;
}

export function ProjectGrid({
    selectedFolderId,
    searchQuery,
    sortBy,
    onSearchChange,
    onSortChange,
    onOpenRelatedAssets,
}: ProjectGridProps) {
    const router = useRouter();
    const { getProjects } = useProjectApi();

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadProjects = async () => {
            setLoading(true);
            try {
                const data = await getProjects(selectedFolderId || undefined);
                if (!cancelled) {
                    setProjects(data);
                }
            } catch (error) {
                console.error("Failed to load projects", error);
                if (!cancelled) {
                    setProjects([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProjects();

        return () => {
            cancelled = true;
        };
    }, [getProjects, selectedFolderId]);

    const filteredProjects = useMemo(() => {
        return projects
            .filter((project) => {
                if (!searchQuery) return true;
                return (project.title || "").toLowerCase().includes(searchQuery.toLowerCase());
            })
            .sort((a, b) => {
                if (sortBy === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                if (sortBy === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                if (sortBy === "a-z") return (a.title || "").localeCompare(b.title || "");
                return (b.title || "").localeCompare(a.title || "");
            });
    }, [projects, searchQuery, sortBy]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-14">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full w-fit">
                        {filteredProjects.length} proyek
                    </span>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari proyek..."
                            className="pl-9 h-9"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => onSearchChange("")}
                                aria-label="Reset pencarian"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as ProjectSort)}
                            className="bg-transparent outline-none"
                            aria-label="Urutkan proyek"
                        >
                            <option value="newest">Terbaru</option>
                            <option value="oldest">Terlama</option>
                            <option value="a-z">A-Z</option>
                            <option value="z-a">Z-A</option>
                        </select>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link href="/projects">Kelola Lengkap</Link>
                    </Button>
                    <Button asChild size="sm" className="gap-2">
                        <Link href="/design/new/interview">
                            <Plus className="w-4 h-4" />
                            Desain Baru
                        </Link>
                    </Button>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                    <p className="text-sm font-medium text-foreground">Belum ada proyek pada konteks ini</p>
                    <p className="text-xs text-muted-foreground mt-1">Coba ganti workspace atau buat desain baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                        <Card
                            key={project.id}
                            className="overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
                            onClick={() => router.push(`/edit/${project.id}`)}
                        >
                            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                                {project.canvas_state?.backgroundUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={
                                            project.canvas_state.backgroundUrl.startsWith("http")
                                                ? `/api/proxy-image?url=${encodeURIComponent(project.canvas_state.backgroundUrl)}`
                                                : project.canvas_state.backgroundUrl
                                        }
                                        alt={project.title || "Project thumbnail"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <Layers className="w-7 h-7" />
                                    </div>
                                )}
                            </div>
                            <div className="p-3 space-y-1 border-t">
                                <p className="text-sm font-semibold truncate">{project.title || "Desain Tanpa Judul"}</p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{new Date(project.updated_at).toLocaleDateString("id-ID")}</span>
                                    <span>{project.aspect_ratio || "1:1"}</span>
                                </div>
                                {onOpenRelatedAssets ? (
                                    <div className="pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenRelatedAssets(project.id);
                                            }}
                                        >
                                            Lihat Hasil Terkait
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

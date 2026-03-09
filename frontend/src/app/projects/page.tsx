"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Plus, PenSquare, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectApi } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";

interface Project {
    id: string;
    title: string;
    updated_at: string;
    canvas_state?: { backgroundUrl?: string };
}

export default function ProjectsPage() {
    const { status } = useSession();
    const router = useRouter();
    const { getProjects, deleteProject } = useProjectApi();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (status === "unauthenticated") {
        redirect("/");
    }

    useEffect(() => {
        if (status === "loading") return;

        const fetchProjects = async () => {
            try {
                const data = await getProjects();
                setProjects(data);
            } catch (err) {
                console.error("Failed to load projects", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [status, getProjects]);

    const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (!window.confirm('Hapus proyek ini? Tindakan ini tidak bisa dibatalkan.')) return;
        setDeletingId(projectId);
        try {
            await deleteProject(projectId);
            setProjects((prev) => prev.filter((p) => p.id !== projectId));
        } catch (err) {
            console.error('Failed to delete project', err);
            alert('Gagal menghapus proyek. Coba lagi.');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading || status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat desain Anda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <div className="flex-1 p-6 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-jakarta font-bold text-foreground">Desain Saya</h1>
                            <p className="text-muted-foreground mt-1">Kelola semua proyek dan desain yang tersimpan.</p>
                        </div>
                        <Button onClick={() => router.push('/create')} size="lg" className="gap-2 font-semibold shadow-md hover:shadow-lg transition-shadow">
                            <Plus className="w-5 h-5" /> Desain Baru
                        </Button>
                    </div>

                    {projects.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-card">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Layers className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">Belum ada desain</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Buat desain pertama Anda dengan bantuan AI untuk memulai.</p>
                            <Button onClick={() => router.push('/create')} size="lg" className="gap-2 shadow-md">
                                <Plus className="w-5 h-5" /> Buat Desain Pertama
                            </Button>
                        </div>
                    ) : (
                        /* Project Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {projects.map((project) => (
                                <Card
                                    key={project.id}
                                    className="overflow-hidden group flex flex-col cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border/60"
                                    onClick={() => router.push(`/edit/${project.id}`)}
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                                        {project.canvas_state?.backgroundUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={project.canvas_state.backgroundUrl}
                                                alt={project.title || "Design thumbnail"}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-muted to-primary/5 flex flex-col items-center justify-center">
                                                <Layers className="w-10 h-10 text-muted-foreground/40 mb-1" />
                                                <span className="text-xs text-muted-foreground/50 font-medium">Belum ada preview</span>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-1.5 shadow-lg"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/edit/${project.id}`);
                                                }}
                                            >
                                                <PenSquare className="w-4 h-4" /> Edit
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <CardHeader className="p-3.5 pb-0 flex-1">
                                        <CardTitle className="text-sm font-semibold truncate">{project.title || "Desain Tanpa Judul"}</CardTitle>
                                    </CardHeader>

                                    <CardFooter className="p-3.5 pt-2 flex justify-between items-center text-xs text-muted-foreground">
                                        <span>{formatDate(project.updated_at)}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground/60 hover:text-red-500 transition-colors"
                                            disabled={deletingId === project.id}
                                            onClick={(e) => handleDeleteProject(e, project.id)}
                                        >
                                            {deletingId === project.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

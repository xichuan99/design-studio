"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { Loader2, Plus, PenSquare, Trash2, Layers, MoreVertical, Copy, Edit2, Check, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { useProjectApi } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface Project {
    id: string;
    title: string;
    updated_at: string;
    canvas_state?: { backgroundUrl?: string };
}

export default function ProjectsPage() {
    const { status } = useSession();
    const router = useRouter();
    const { getProjects, deleteProject, duplicateProject, saveProject } = useProjectApi();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

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

    const handleDuplicateProject = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        setDuplicatingId(projectId);
        try {
            const newProject = await duplicateProject(projectId);
            setProjects([newProject, ...projects]);
        } catch (err) {
            console.error('Failed to duplicate project', err);
            alert('Gagal menduplikasi proyek. Coba lagi.');
        } finally {
            setDuplicatingId(null);
        }
    };

    const handleRenameSubmit = async (e: React.FormEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editingTitle.trim() || editingTitle === project.title) {
            setEditingId(null);
            return;
        }

        try {
            await saveProject({
                id: project.id,
                title: editingTitle,
                canvas_state: project.canvas_state || {},
                status: 'draft'
            });
            setProjects(projects.map(p => p.id === project.id ? { ...p, title: editingTitle } : p));
            setEditingId(null);
        } catch (err) {
            console.error('Failed to rename project', err);
            alert('Gagal mengubah nama proyek.');
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

                    {/* AI Tools Banner */}
                    <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> AI Photo Tools Baru!</h2>
                            <p className="text-muted-foreground text-sm mt-1">Sulap foto buram jadi HD atau ganti background produk dengan otomatis.</p>
                        </div>
                        <Button onClick={() => router.push('/tools')} variant="default" className="shrink-0 shadow-sm">
                            Coba Fitur AI
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
                                                src={
                                                    project.canvas_state.backgroundUrl.startsWith('http')
                                                        ? `/api/proxy-image?url=${encodeURIComponent(project.canvas_state.backgroundUrl)}`
                                                        : project.canvas_state.backgroundUrl
                                                }
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
                                    <div className="p-3.5 pb-0 flex-1 flex flex-col justify-center">
                                        {editingId === project.id ? (
                                            <form onSubmit={(e) => handleRenameSubmit(e, project)} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <Input
                                                    autoFocus
                                                    value={editingTitle}
                                                    onChange={e => setEditingTitle(e.target.value)}
                                                    className="h-7 text-sm px-2 bg-background/50"
                                                />
                                                <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </form>
                                        ) : (
                                            <h3 className="text-sm font-semibold truncate" title={project.title}>{project.title || "Desain Tanpa Judul"}</h3>
                                        )}
                                    </div>

                                    <CardFooter className="p-3.5 pt-2 flex justify-between items-center text-xs text-muted-foreground border-t mt-2">
                                        <span>{formatDate(project.updated_at)}</span>
                                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-border/50">
                                                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => { e.stopPropagation(); setEditingId(project.id); setEditingTitle(project.title || ''); }}>
                                                        <Edit2 className="w-4 h-4 text-muted-foreground" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleDuplicateProject(e, project.id)} disabled={duplicatingId === project.id}>
                                                        {duplicatingId === project.id ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => handleDeleteProject(e, project.id)} disabled={deletingId === project.id}>
                                                        {deletingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
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

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { Loader2, Plus, PenSquare, Trash2, Layers, MoreVertical, Copy, Edit2, Check, X, Wand2, Search, ArrowUpDown, SearchX, FolderOpen, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { useProjectApi } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FolderSidebar } from "@/components/projects/FolderSidebar";
import { Folder } from "@/lib/api/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    created_at?: string;
    aspect_ratio?: string;
    status?: string;
    canvas_schema_version?: number;
    canvas_state?: { backgroundUrl?: string; elements?: Record<string, unknown>[] };
    folder_id?: string | null;
}

export default function ProjectsPage() {
    const { status } = useSession();
    const router = useRouter();
    const { getProjects, deleteProject, duplicateProject, saveProject, getFolders } = useProjectApi();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Folder states
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [movingProject, setMovingProject] = useState<Project | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');
    const [showNewDesignDialog, setShowNewDesignDialog] = useState(false);

    if (status === "unauthenticated") {
        redirect("/");
    }

    useEffect(() => {
        if (status === "loading") return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [projectsData, foldersData] = await Promise.all([
                    getProjects(selectedFolderId || undefined),
                    getFolders()
                ]);
                setProjects(projectsData);
                setFolders(foldersData);
            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [status, selectedFolderId, getProjects, getFolders]);

    const handleNewDesignClick = () => {
        const saved = localStorage.getItem('smartdesign_create_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Check if it's "pristine" (empty state)
                const isPristine = !parsed.rawText && parsed.currentStep === 'input' && (!parsed.imageHistory || parsed.imageHistory.length === 0);
                if (!isPristine) {
                    setShowNewDesignDialog(true);
                    return;
                }
            } catch (e) {
                // Ignore parse error and proceed
                console.warn("Error parsing smartdesign_create_state", e);
            }
        }
        
        // If pristine or no saved state, just proceed
        router.push('/create');
    };

    const confirmDeleteProject = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        setProjectToDelete(projectId);
    };

    const executeDeleteProject = async () => {
        if (!projectToDelete) return;
        setDeletingId(projectToDelete);
        try {
            await deleteProject(projectToDelete);
            setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
            toast.success("Proyek berhasil dihapus");
        } catch (err) {
            console.error('Failed to delete project', err);
            toast.error('Gagal menghapus proyek. Coba lagi.');
        } finally {
            setDeletingId(null);
            setProjectToDelete(null);
        }
    };

    const handleDuplicateProject = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        setDuplicatingId(projectId);
        try {
            const newProject = await duplicateProject(projectId);
            setProjects([newProject, ...projects]);
            toast.success("Proyek berhasil diduplikasi");
        } catch (err) {
            console.error('Failed to duplicate project', err);
            toast.error('Gagal menduplikasi proyek. Coba lagi.');
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
                status: 'draft',
                folder_id: project.folder_id
            });
            setProjects(projects.map(p => p.id === project.id ? { ...p, title: editingTitle } : p));
            setEditingId(null);
            toast.success("Nama proyek berhasil diubah");
        } catch (err) {
            console.error('Failed to rename project', err);
            toast.error('Gagal mengubah nama proyek.');
        }
    };

    const handleMoveProject = async (folderId: string | null) => {
        if (!movingProject) return;
        try {
            await saveProject({
                id: movingProject.id,
                title: movingProject.title,
                canvas_state: movingProject.canvas_state || {},
                status: 'draft',
                folder_id: folderId
            });
            
            // Remove from list if we are currently filtering by folder and we just moved it
            if (selectedFolderId !== folderId) {
                setProjects(projects.filter(p => p.id !== movingProject.id));
            } else {
                setProjects(projects.map(p => p.id === movingProject.id ? { ...p, folder_id: folderId } : p));
            }
            toast.success("Design dipindahkan");
        } catch (err) {
            console.error('Failed to move project', err);
            toast.error('Gagal memindahkan design.');
        } finally {
            setMovingProject(null);
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const filteredAndSortedProjects = projects
        .filter(p => !searchQuery || (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            if (sortBy === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
            if (sortBy === 'a-z') return (a.title || "").localeCompare(b.title || "");
            if (sortBy === 'z-a') return (b.title || "").localeCompare(a.title || "");
            return 0;
        });

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
            <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
                <div className="w-64 shrink-0 border-r border-border/50 p-6 hidden md:block">
                    <FolderSidebar 
                        selectedFolderId={selectedFolderId} 
                        onSelectFolder={setSelectedFolderId} 
                    />
                </div>
                
                <div className="flex-1 p-6 md:p-8 space-y-8 min-w-0">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">
                                {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name || 'Workspace' : 'Semua Desain'}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                                {selectedFolderId ? 'Kelola desain dalam workspace ini.' : 'Kelola semua proyek dan desain yang tersimpan.'}
                            </p>
                        </div>
                        <Button onClick={handleNewDesignClick} size="lg" className="gap-2 font-semibold shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
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

                    {/* Controls Row */}
                    {projects.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-2 px-3 rounded-xl border border-border/50 shadow-sm">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="bg-primary/10 text-primary font-semibold text-xs px-2.5 py-1 rounded-full whitespace-nowrap">
                                    {filteredAndSortedProjects.length} desain
                                </span>
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Cari desain..." 
                                        className="pl-9 h-9 bg-background border-border/50 focus-visible:ring-1"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 gap-2 w-full sm:w-auto border-border/50 font-normal">
                                            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                            {sortBy === 'newest' ? 'Terbaru' : 
                                             sortBy === 'oldest' ? 'Terlama' : 
                                             sortBy === 'a-z' ? 'A-Z' : 'Z-A'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'bg-primary/5 text-primary' : ''}>Terbaru</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortBy('oldest')} className={sortBy === 'oldest' ? 'bg-primary/5 text-primary' : ''}>Terlama</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortBy('a-z')} className={sortBy === 'a-z' ? 'bg-primary/5 text-primary' : ''}>A-Z</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortBy('z-a')} className={sortBy === 'z-a' ? 'bg-primary/5 text-primary' : ''}>Z-A</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    )}

                    {projects.length === 0 ? (
                        /* Empty State - No Projects */
                        <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-card">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Layers className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">Belum ada desain</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Buat desain pertama Anda dengan bantuan AI untuk memulai.</p>
                            <Button onClick={handleNewDesignClick} size="lg" className="gap-2 shadow-md">
                                <Plus className="w-5 h-5" /> Buat Desain Pertama
                            </Button>
                        </div>
                    ) : filteredAndSortedProjects.length === 0 ? (
                        /* Empty State - Search Not Found */
                        <div className="text-center py-20 border border-border/50 rounded-2xl bg-card/50">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <SearchX className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1 text-foreground">Pencarian tidak ditemukan</h3>
                            <p className="text-muted-foreground text-sm mb-4">Tidak ada desain yang cocok dengan &quot;{searchQuery}&quot;</p>
                            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                                Reset Pencarian
                            </Button>
                        </div>
                    ) : (
                        /* Project Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {filteredAndSortedProjects.map((project) => (
                                <Card
                                    key={project.id}
                                    className="overflow-hidden group flex flex-col cursor-pointer hover:shadow-[0_0_15px_rgba(108,43,238,0.15)] hover:border-primary/40 hover:scale-[1.02] transition-all duration-200 border-border/60"
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

                                    <CardFooter className="p-3.5 pt-2.5 flex justify-between items-center text-xs text-muted-foreground border-t mt-2">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="font-medium truncate">{formatDate(project.updated_at)}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-muted/80 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-border/50 text-foreground/70 tracking-wide">
                                                    {project.aspect_ratio || '1:1'}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                                                    <Layers className="w-3 h-3" />
                                                    {project.canvas_state?.elements?.length || 0} layer
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[32px] min-h-[32px] text-muted-foreground hover:text-foreground transition-colors shrink-0">
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
                                                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => { e.stopPropagation(); setMovingProject(project); }}>
                                                        <FolderOpen className="w-4 h-4 text-muted-foreground" /> Move to Workspace
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => confirmDeleteProject(e, project.id)} disabled={deletingId === project.id}>
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Proyek</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak bisa dibatalkan. Proyek ini akan dihapus secara permanen dari server.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={executeDeleteProject}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* New Design Draft Confirmation Dialog */}
            <AlertDialog open={showNewDesignDialog} onOpenChange={setShowNewDesignDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Lanjutkan Desain Sebelumnya?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Saat ini ada draf desain yang sedang berjalan. Apakah Anda ingin melanjutkan desain tersebut atau membuat yang baru dari awal? (Membuat baru akan menghapus draf sementara).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-between">
                        <Button 
                            variant="ghost" 
                            onClick={() => setShowNewDesignDialog(false)}
                        >
                            Batal
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="destructive" 
                                onClick={() => {
                                    localStorage.removeItem('smartdesign_create_state');
                                    setShowNewDesignDialog(false);
                                    router.push('/create');
                                }}
                            >
                                Buat Baru
                            </Button>
                            <Button 
                                onClick={() => {
                                    setShowNewDesignDialog(false);
                                    router.push('/create');
                                }}
                            >
                                Lanjutkan
                            </Button>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Move Project Dialog */}
            <AlertDialog open={!!movingProject} onOpenChange={(open) => !open && setMovingProject(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pindahkan ke Workspace</AlertDialogTitle>
                        <AlertDialogDescription>
                            Pilih workspace tujuan untuk desain &quot;{movingProject?.title || 'Tanpa Judul'}&quot;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="py-2 space-y-2 max-h-[300px] overflow-y-auto">
                        <Button
                            variant="outline"
                            className="w-full justify-start font-medium h-10"
                            onClick={() => handleMoveProject(null)}
                        >
                            <FolderOpen className="w-4 h-4 mr-3 text-muted-foreground" />
                            Tanpa Workspace (Semua Desain)
                        </Button>
                        {folders.map(folder => (
                            <Button
                                key={folder.id}
                                variant="outline"
                                className="w-full justify-start font-medium h-10"
                                onClick={() => handleMoveProject(folder.id)}
                            >
                                <FolderIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                                {folder.name}
                            </Button>
                        ))}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMovingProject(null)}>Batal</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

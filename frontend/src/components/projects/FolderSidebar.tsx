"use client";

import { useEffect, useState } from "react";
import { Folder as FolderIcon, Plus, MoreVertical, Edit2, Trash2, FolderOpen, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectApi } from "@/lib/api";
import { Folder } from "@/lib/api/types";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface FolderSidebarProps {
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
}

export function FolderSidebar({ selectedFolderId, onSelectFolder }: FolderSidebarProps) {
    const { getFolders, createFolder, updateFolder, deleteFolder } = useProjectApi();
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const fetchFolders = async () => {
        try {
            const data = await getFolders();
            setFolders(data);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat daftar workspace");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreate = async () => {
        if (!newFolderName.trim()) return;
        try {
            const newFolder = await createFolder({ name: newFolderName });
            setFolders([...folders, newFolder]);
            setNewFolderName("");
            setIsCreating(false);
            toast.success("Workspace berhasil dibuat");
        } catch (error) {
            console.error(error);
            toast.error("Gagal membuat workspace");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus workspace ini? Semua proyek di dalamnya akan kehilangan label workspace ini.")) return;
        try {
            await deleteFolder(id);
            setFolders(folders.filter(f => f.id !== id));
            if (selectedFolderId === id) onSelectFolder(null);
            toast.success("Workspace dihapus");
        } catch (error) {
            console.error(error);
            toast.error("Gagal menghapus workspace");
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) {
            setEditingId(null);
            return;
        }
        try {
            const updated = await updateFolder(id, { name: editName });
            setFolders(folders.map(f => f.id === id ? updated : f));
            setEditingId(null);
            toast.success("Nama workspace diperbarui");
        } catch (error) {
            console.error(error);
            toast.error("Gagal memperbarui nama");
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Workspaces</h2>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setIsCreating(true)}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto">
                <Button
                    variant={selectedFolderId === null ? "secondary" : "ghost"}
                    className={`justify-start gap-3 h-9 font-medium ${selectedFolderId === null ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => onSelectFolder(null)}
                >
                    <FolderOpen className="w-4 h-4" />
                    Semua Desain
                </Button>

                {isCreating && (
                    <div className="flex items-center gap-1 mt-1">
                        <Input 
                            autoFocus
                            placeholder="Nama workspace"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            className="h-8 text-sm"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={handleCreate}>
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => setIsCreating(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {folders.map(folder => (
                    <div key={folder.id} className="group relative flex items-center">
                        {editingId === folder.id ? (
                            <div className="flex items-center gap-1 w-full">
                                <Input 
                                    autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdate(folder.id)}
                                    className="h-8 text-sm flex-1"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={() => handleUpdate(folder.id)}>
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => setEditingId(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button
                                    variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                                    className={`flex-1 justify-start gap-3 h-9 font-medium truncate pr-8 ${selectedFolderId === folder.id ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                    onClick={() => onSelectFolder(folder.id)}
                                >
                                    <FolderIcon className={`w-4 h-4 shrink-0 ${selectedFolderId === folder.id ? 'fill-primary/20 text-primary' : 'text-muted-foreground'}`} />
                                    <span className="truncate">{folder.name}</span>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="absolute right-0 w-8 h-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                        <DropdownMenuItem onClick={() => { setEditingId(folder.id); setEditName(folder.name); }}>
                                            <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" /> Ubah Nama
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(folder.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

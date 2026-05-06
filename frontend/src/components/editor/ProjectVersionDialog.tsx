"use client";

import React, { useEffect, useState } from 'react';
import { useProjectApi } from '@/lib/api';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ProjectVersionResponse } from '@/lib/api/types';
import { Loader2, History, RotateCcw, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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

interface ProjectVersionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId?: string;
}

export const ProjectVersionDialog: React.FC<ProjectVersionDialogProps> = ({ open, onOpenChange, projectId }) => {
    const { getProjectVersions, createProjectVersion, deleteProjectVersion } = useProjectApi();
    const { elements, backgroundUrl, backgroundColor, originalPrompt, loadState } = useCanvasStore();
    
    const [versions, setVersions] = useState<ProjectVersionResponse[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Create new version state
    const [isCreating, setIsCreating] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // Restore version state
    const [versionToRestore, setVersionToRestore] = useState<ProjectVersionResponse | null>(null);

    // Delete version state
    const [versionToDelete, setVersionToDelete] = useState<ProjectVersionResponse | null>(null);

    useEffect(() => {
        if (open && projectId) {
            fetchVersions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, projectId]);

    const fetchVersions = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await getProjectVersions(projectId);
            setVersions(data);
        } catch (err) {
            console.error('Failed to load project versions:', err);
            toast.error('Gagal memuat riwayat versi');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVersion = async () => {
        if (!projectId) return;
        if (!newVersionName.trim()) {
            toast.error('Nama versi tidak boleh kosong');
            return;
        }

        setCreateLoading(true);
        try {
            const canvasState = {
                elements,
                backgroundUrl,
                backgroundColor,
                originalPrompt,
            };

            await createProjectVersion(projectId, {
                version_name: newVersionName,
                canvas_state: canvasState,
                // assume schema version is 1 for now, or fetch from project if we had it
            });
            
            toast.success('Versi berhasil disimpan');
            setNewVersionName('');
            setIsCreating(false);
            fetchVersions();
        } catch (err) {
            console.error('Failed to create version:', err);
            toast.error('Gagal membuat versi baru');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleRestoreClick = (version: ProjectVersionResponse) => {
        setVersionToRestore(version);
    };

    const confirmRestore = () => {
        if (!versionToRestore) return;
        
        try {
            const state = versionToRestore.canvas_state as Record<string, unknown>;
            if (state && typeof state === 'object') {
                const els = Array.isArray(state.elements) ? state.elements : [];
                const bgUrl = (state.backgroundUrl as string) || null;
                const bgColor = (state.backgroundColor as string) || '#ffffff';
                
                loadState(els, bgUrl);
                useCanvasStore.setState({ backgroundColor: bgColor });
                
                toast.success(`Berhasil dipulihkan ke versi "${versionToRestore.version_name}"`);
                setVersionToRestore(null);
                onOpenChange(false);
            } else {
                toast.error('Data versi tidak valid');
            }
        } catch (err) {
            console.error('Restore error:', err);
            toast.error('Gagal memulihkan versi');
        }
    };

    const handleDeleteClick = (version: ProjectVersionResponse) => {
        setVersionToDelete(version);
    }

    const confirmDelete = async () => {
        if (!versionToDelete || !projectId) return;
        
        try {
            await deleteProjectVersion(projectId, versionToDelete.id);
            toast.success('Versi berhasil dihapus');
            setVersionToDelete(null);
            fetchVersions();
        } catch (err) {
            console.error('Failed to delete version:', err);
            toast.error('Gagal menghapus versi');
        }
    }

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-lg font-jakarta">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Version History
                    </DialogTitle>
                    <DialogDescription>
                        Simpan *snapshot* atau pulihkan versi desain sebelumnya.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Create New Version Section */}
                    {!isCreating ? (
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed gap-2"
                            onClick={() => setIsCreating(true)}
                            disabled={!projectId}
                        >
                            <Plus className="w-4 h-4" />
                            Buat Snapshot Versi Baru
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                            <Input 
                                placeholder="Nama versi (misal: V2 Revisi Klien)" 
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleCreateVersion();
                                }}
                            />
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={handleCreateVersion}
                                disabled={createLoading || !newVersionName.trim()}
                            >
                                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setIsCreating(false)}
                            >
                                Batal
                            </Button>
                        </div>
                    )}

                    {/* Version List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Belum ada riwayat versi tersimpan.</p>
                            </div>
                        ) : (
                            versions.map((version) => (
                                <div key={version.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors group">
                                    <div className="mb-2 sm:mb-0">
                                        <h4 className="font-semibold text-sm">{version.version_name}</h4>
                                        <p className="text-xs text-muted-foreground">{formatDate(version.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className="h-8 text-xs gap-1"
                                            onClick={() => handleRestoreClick(version)}
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Pulihkan
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                            onClick={() => handleDeleteClick(version)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Restore Confirmation Dialog */}
                <AlertDialog open={!!versionToRestore} onOpenChange={(o) => (!o && setVersionToRestore(null))}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Pulihkan Versi &quot;{versionToRestore?.version_name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Kanvas Kamu saat ini akan ditimpa dengan status dari versi ini. Perubahan yang belum Kamu simpan (atau belum dibuat snapshot) akan hilang.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmRestore} className="bg-primary hover:bg-primary/90">
                                Ya, Pulihkan
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!versionToDelete} onOpenChange={(o) => (!o && setVersionToDelete(null))}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Versi &quot;{versionToDelete?.version_name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Snapshot versi ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Ya, Hapus
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
};

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useProjectApi, BrandKit } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, User, Save, Loader2, CheckCircle2, Coins, Palette, Plus } from "lucide-react";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

export default function SettingsPage() {
    const { data: session, status: sessionStatus, update } = useSession();
    const router = useRouter();
    const api = useProjectApi();

    const [name, setName] = useState("");
    const [originalName, setOriginalName] = useState("");
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Brand Kit State
    const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
    const [activeBrandKitId, setActiveBrandKitId] = useState<string | null>(null);
    const [isLoadingKits, setIsLoadingKits] = useState(true);

    // Route guard: redirect if unauthenticated
    useEffect(() => {
        if (sessionStatus === "unauthenticated") {
            router.push("/");
        }
    }, [sessionStatus, router]);

    const fetchProfile = useCallback(async () => {
        try {
            const profile = await api.getUserProfile();
            setName(profile.name);
            setOriginalName(profile.name);
            setCredits(profile.credits_remaining);
        } catch (err: unknown) {
            setError((err as Error).message || "Gagal memuat profil");
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    const fetchBrandKits = useCallback(async () => {
        try {
            setIsLoadingKits(true);
            const [allKits, active] = await Promise.all([
                api.getBrandKits(),
                api.getActiveBrandKit()
            ]);
            setBrandKits(allKits);
            if (active) setActiveBrandKitId(active.id);
        } catch (err) {
            console.error("Failed to load brand kits", err);
        } finally {
            setIsLoadingKits(false);
        }
    }, [api]);

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchProfile();
            fetchBrandKits();
        }
    }, [sessionStatus, fetchProfile, fetchBrandKits]);

    // Auto-clear success message
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const nameValidationError = (): string | null => {
        const trimmed = name.trim();
        if (trimmed.length === 0) return "Nama tidak boleh kosong";
        if (trimmed.length < NAME_MIN_LENGTH) return `Nama minimal ${NAME_MIN_LENGTH} karakter`;
        if (trimmed.length > NAME_MAX_LENGTH) return `Nama maksimal ${NAME_MAX_LENGTH} karakter`;
        return null;
    };

    const isNameChanged = name.trim() !== originalName;
    const validationErr = nameValidationError();
    const canSave = isNameChanged && !validationErr && !isSaving;

    const handleSaveProfile = async () => {
        if (!canSave) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const result = await api.updateProfile(name.trim());
            setOriginalName(result.name);
            setName(result.name);
            await update({ name: result.name });
            setSuccess("Profil berhasil diperbarui!");
        } catch (err: unknown) {
            setError((err as Error).message || "Gagal memperbarui profil");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            await api.deleteAccount();
            await signOut({ redirect: false });
            router.push("/");
        } catch (err: unknown) {
            setError((err as Error).message || "Gagal menghapus akun");
            setIsDeleting(false);
        }
    };

    const handleSetActiveBrandKit = async (id: string) => {
        try {
            await api.updateBrandKit(id, { is_active: true });
            setActiveBrandKitId(id);
            setSuccess("Brand Kit berhasil diaktifkan.");
            setTimeout(() => setSuccess(null), 3000);
            await fetchBrandKits();
        } catch (err) {
            console.error(err);
            setError("Gagal mengaktifkan Brand Kit.");
        }
    };

    const handleDeleteBrandKit = async (id: string) => {
        try {
            await api.deleteBrandKit(id);
            setSuccess("Brand Kit berhasil dihapus.");
            setTimeout(() => setSuccess(null), 3000);
            await fetchBrandKits();
        } catch (err) {
            console.error(err);
            setError("Gagal menghapus Brand Kit.");
        }
    };

    if (isLoading && sessionStatus !== "unauthenticated") {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
                <p className="text-muted-foreground">Memuat pengaturan...</p>
            </div>
        );
    }

    if (sessionStatus === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 mt-16">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <User className="h-8 w-8 text-purple-600" />
                        Pengaturan Akun
                    </h1>
                    <p className="text-muted-foreground">
                        Kelola informasi profil dan kredensial akun Anda.
                    </p>
                </div>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/15 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{success}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {/* Left Column - General Settings */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Profile Info Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Profil Anda</CardTitle>
                                <CardDescription>Ubah nama tampilan publik Anda.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium leading-none">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={session?.user?.email || ""}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Email terhubung via Google Authentication dan tidak dapat diubah.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium leading-none">
                                        Nama
                                    </label>
                                    <Input
                                        id="name"
                                        placeholder="Nama Lengkap"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={isSaving}
                                        maxLength={NAME_MAX_LENGTH}
                                    />
                                    {validationErr && isNameChanged && (
                                        <p className="text-[0.8rem] text-destructive">{validationErr}</p>
                                    )}
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        {name.trim().length}/{NAME_MAX_LENGTH} karakter
                                    </p>
                                </div>

                                {credits !== null && (
                                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                                        <Coins className="h-4 w-4 text-yellow-500" />
                                        <span>Sisa kredit: <strong className="text-foreground">{credits}</strong></span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={!canSave}
                                    className="gap-2"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Simpan Perubahan
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Brand Kit Card */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="h-5 w-5 text-indigo-500" />
                                        Brand Kit Manager
                                    </CardTitle>
                                    <CardDescription>
                                        Kelola warna identitas brand Anda. Brand Kit aktif akan otomatis digunakan saat men-generate desain atau Magic Text.
                                    </CardDescription>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={() => router.push('/create')}
                                >
                                    <Plus className="h-4 w-4" />
                                    Buat Baru
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoadingKits ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : brandKits.length === 0 ? (
                                    <div className="text-center p-8 bg-muted/30 rounded-lg border border-dashed">
                                        <Palette className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                                        <h3 className="text-sm font-medium mb-1">Belum Ada Brand Kit</h3>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            Ekstrak warna otomatis dari logo Anda di editor.
                                        </p>
                                        <Button 
                                            variant="secondary" 
                                            size="sm"
                                            onClick={() => router.push('/create')}
                                        >
                                            Buat Sekarang
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {brandKits.map(kit => {
                                            const isActive = kit.id === activeBrandKitId;
                                            return (
                                                <div 
                                                    key={kit.id} 
                                                    className={`p-4 rounded-xl border flex flex-col gap-4 relative overflow-hidden transition-all ${isActive ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/20 shadow-sm' : 'bg-card border-border hover:border-indigo-200'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                                                                {kit.name}
                                                                {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                Dibuat {new Date(kit.created_at).toLocaleDateString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {kit.colors.map((c, i) => (
                                                            <div 
                                                                key={i} 
                                                                className="w-8 h-8 rounded-full border border-border/50 shadow-sm relative group cursor-help"
                                                                style={{ backgroundColor: c.hex }}
                                                            >
                                                                <div className="absolute opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[10px] py-0.5 px-1.5 rounded -top-8 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                                                    {c.hex}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50">
                                                        {!isActive ? (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2"
                                                                onClick={() => handleSetActiveBrandKit(kit.id)}
                                                            >
                                                                Jadikan Aktif
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs font-medium text-emerald-600 px-2 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Aktif Digunakan
                                                            </span>
                                                        )}
                                                        
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Hapus Brand Kit?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Anda yakin ingin menghapus <strong>{kit.name}</strong>? Aksi ini tidak dapat dibatalkan.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDeleteBrandKit(kit.id)}
                                                                        className="bg-destructive hover:bg-destructive/90 text-white"
                                                                    >
                                                                        Ya, Hapus
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column - Danger Zone */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="border-destructive/50">
                            <CardHeader>
                                <CardTitle className="text-destructive flex items-center gap-2">
                                    <Trash2 className="h-5 w-5" />
                                    Danger Zone
                                </CardTitle>
                                <CardDescription>Aksi permanen pada akun Anda.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Menghapus akun Anda akan <strong>membersihkan semua data proyek dan kredit</strong> yang tersisa secara permanen. Tindakan ini tidak dapat dibatalkan.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full">
                                            Hapus Akun
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Aksi ini tidak dapat dibatalkan. Akun Anda, beserta sisa kredit dan semua proyek desain di dalamnya akan langsung terhapus dari server kami secara permanen.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeleteAccount}
                                                disabled={isDeleting}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                {isDeleting ? "Menghapus..." : "Ya, Hapus Akun"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

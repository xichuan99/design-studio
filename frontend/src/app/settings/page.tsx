"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useProjectApi } from "@/lib/api";
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
import { Trash2, User, Save, Loader2, CheckCircle2, Coins } from "lucide-react";

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

    useEffect(() => {
        if (session) {
            fetchProfile();
        }
    }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (sessionStatus === "loading" || isLoading) {
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

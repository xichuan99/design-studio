"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useProjectApi } from "@/lib/api";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Settings2, CalendarDays, Loader2, Save, CheckCircle2 } from "lucide-react";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

export function ProfileSection() {
    const { data: session, update } = useSession();
    const api = useProjectApi();

    const [name, setName] = useState("");
    const [originalName, setOriginalName] = useState("");
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [provider, setProvider] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const profile = await api.getUserProfile();
            setName(profile.name);
            setOriginalName(profile.name);
            setCreatedAt(profile.created_at || null);
            setProvider(profile.provider || null);
        } catch (err: unknown) {
            setError((err as Error).message || "Gagal memuat profil");
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const nameValidationError = (): string | null => {
        const trimmed = name.trim();
        if (trimmed.length === 0) return "Nama tidak boleh kosong";
        if (trimmed.length < NAME_MIN_LENGTH)
            return `Nama minimal ${NAME_MIN_LENGTH} karakter`;
        if (trimmed.length > NAME_MAX_LENGTH)
            return `Nama maksimal ${NAME_MAX_LENGTH} karakter`;
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

    if (isLoading) {
        return (
            <SettingsSection
                title="Profil Akun"
                description="Kelola identitas publik dan detail email untuk akun Anda terdaftar pada sistem kami."
                icon={User}
            >
                <Card className="shadow-sm border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm h-48 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </Card>
            </SettingsSection>
        );
    }

    return (
        <SettingsSection
            title="Profil Akun"
            description="Kelola identitas publik dan detail email untuk akun Anda terdaftar pada sistem kami."
            icon={User}
        >
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-4 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{success}</span>
                </div>
            )}
            
            <Card className="shadow-sm border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center border-4 border-background shadow-sm ring-1 ring-border/50 shrink-0">
                            {session?.user?.image && !avatarError ? (
                                <Image
                                    src={session.user.image}
                                    alt="Avatar"
                                    width={96}
                                    height={96}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <User className="h-10 w-10 text-indigo-500" />
                            )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <h3 className="font-semibold text-xl leading-none">
                                {originalName || "User"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-md text-sm text-muted-foreground font-medium border border-border/50">
                                    <Mail className="w-4 h-4" />
                                    {session?.user?.email}
                                </div>
                                {provider && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-md text-sm font-medium border border-indigo-200/50 dark:border-indigo-800/50">
                                        <Settings2 className="w-4 h-4" />
                                        Via {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                    </div>
                                )}
                                {createdAt && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 rounded-md text-sm text-muted-foreground font-medium border border-border/40">
                                        <CalendarDays className="w-4 h-4" />
                                        Bergabung sejak {new Date(createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-border/40">
                        <div className="space-y-2.5 max-w-md relative">
                            <label
                                htmlFor="name"
                                className="text-sm font-semibold"
                            >
                                Nama Tampilan
                            </label>
                            <Input
                                id="name"
                                placeholder="Nama Lengkap"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSaving}
                                maxLength={NAME_MAX_LENGTH}
                                className="bg-background focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium py-5"
                            />
                            <div className="flex justify-between items-center text-xs mt-1 absolute-bottom-helper">
                                {validationErr && isNameChanged ? (
                                    <span className="text-destructive font-bold">
                                        {validationErr}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground/80">
                                        Gunakan nama asli untuk mempermudah.
                                    </span>
                                )}
                                <span className="text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded ml-2 shrink-0">
                                    {name.trim().length}/{NAME_MAX_LENGTH}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/20 px-6 py-4 border-t border-border/40 flex justify-end">
                    <Button
                        onClick={handleSaveProfile}
                        disabled={!canSave}
                        className="gap-2 transition-all px-6 font-medium"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Simpan Perubahan
                    </Button>
                </CardFooter>
            </Card>
        </SettingsSection>
    );
}

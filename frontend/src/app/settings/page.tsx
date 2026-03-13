"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useProjectApi, BrandKit } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Trash2,
    User,
    Save,
    Loader2,
    CheckCircle2,
    Coins,
    Palette,
    Plus,
    ShieldAlert,
    Sparkles,
    Mail,
    ChevronRight,
} from "lucide-react";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

function SettingsSection({
    title,
    description,
    icon: Icon,
    children,
    isDanger = false,
}: {
    title: string;
    description: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    isDanger?: boolean;
}) {
    return (
        <div className="flex flex-col md:flex-row gap-8 py-10 border-b last:border-0 border-border/40">
            <div className="md:w-1/3 flex-shrink-0 space-y-3">
                <h2
                    className={`text-lg font-semibold flex items-center gap-2.5 ${
                        isDanger ? "text-destructive" : "text-foreground"
                    }`}
                >
                    {Icon && <Icon className="w-5 h-5 flex-shrink-0 opacity-80" />}
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed pr-4 md:max-w-xs">
                    {description}
                </p>
            </div>
            <div className="md:w-2/3">{children}</div>
        </div>
    );
}

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchBrandKits = useCallback(async () => {
        try {
            setIsLoadingKits(true);
            const [allKits, active] = await Promise.all([
                api.getBrandKits(),
                api.getActiveBrandKit(),
            ]);
            setBrandKits(allKits);
            if (active) setActiveBrandKitId(active.id);
        } catch (err) {
            console.error("Failed to load brand kits", err);
        } finally {
            setIsLoadingKits(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                <p className="text-muted-foreground animate-pulse">
                    Memuat pengaturan aplikasi...
                </p>
            </div>
        );
    }

    if (sessionStatus === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-background/50">
            <AppHeader />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-16">
                <div className="mb-12 space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Pengaturan
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                        Kelola informasi identitas, referensi palet warna bisnis Anda, dan sisa
                        penggunaan kredit AI generatif.
                    </p>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-8 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl mb-8 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{success}</span>
                    </div>
                )}

                <div className="space-y-2">
                    {/* -- SECTION PROFILE -- */}
                    <SettingsSection
                        title="Profil Akun"
                        description="Kelola identitas publik dan detail email untuk akun Anda terdaftar pada sistem kami."
                        icon={User}
                    >
                        <Card className="shadow-sm border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-6 sm:p-8 space-y-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center border-4 border-background shadow-sm ring-1 ring-border/50 shrink-0">
                                        {session?.user?.image ? (
                                            <Image
                                                src={session.user.image}
                                                alt="Avatar"
                                                width={96}
                                                height={96}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-10 w-10 text-indigo-500" />
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <h3 className="font-semibold text-xl leading-none">
                                            {originalName || "User"}
                                        </h3>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-md w-fit text-sm text-muted-foreground font-medium border border-border/50">
                                            <Mail className="w-4 h-4" />
                                            {session?.user?.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-border/40">
                                    <div className="space-y-2.5 max-w-md">
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

                    {/* -- SECTION CREDITS -- */}
                    <SettingsSection
                        title="Kredit AI"
                        description="Pantau penggunaan dan sisa kuota kredit generasi AI generatif Anda (gambar, hapus background, magic text)."
                        icon={Sparkles}
                    >
                        <Card className="shadow-sm border-indigo-200/50 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                                <Coins className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            Sisa Kredit Anda
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-sm">
                                            Setiap generasi gambar teks atau fitur AI di editor akan memotong 1 kredit.
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center sm:items-end">
                                        <div className="text-5xl font-extrabold tracking-tighter text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950 px-8 py-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900 min-w-[140px] text-center">
                                            {credits !== null ? credits : "-"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </SettingsSection>

                    {/* -- SECTION BRAND KIT -- */}
                    <SettingsSection
                        title="Brand Kit"
                        description="Kelola palet warna otentik merek Anda. Tetapkan sebagai default agar senantiasa teraplikasikan pada setiap desain baru yang Anda buat."
                        icon={Palette}
                    >
                        <Card className="shadow-sm border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border/40 px-6 sm:px-8 py-5">
                                <CardTitle className="text-base font-semibold">
                                    Daftar Brand Kit
                                </CardTitle>
                                <Button
                                    size="sm"
                                    className="gap-1.5 h-8 font-medium"
                                    onClick={() => router.push("/create")}
                                >
                                    <Plus className="h-4 w-4" />
                                    Buat Baru
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                {isLoadingKits ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500/50" />
                                        <span className="text-sm text-muted-foreground font-medium">Memuat palet...</span>
                                    </div>
                                ) : brandKits.length === 0 ? (
                                    <div className="text-center py-14 bg-muted/20 rounded-xl border border-dashed border-border/60 transition-colors hover:bg-muted/30 hover:border-border">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
                                            <Palette className="w-8 h-8 text-muted-foreground/60" />
                                        </div>
                                        <h3 className="text-base font-semibold mb-2 text-foreground/90">
                                            Belum Ada Brand Kit
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                                            Lakukan ekstraksi warna otomatis dari logo Anda di editor lalu simpan sebagai preset.
                                        </p>
                                        <Button
                                            variant="secondary"
                                            onClick={() => router.push("/create")}
                                            className="font-medium group"
                                        >
                                            Buat Sekarang
                                            <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {brandKits.map((kit) => {
                                            const isActive = kit.id === activeBrandKitId;
                                            return (
                                                <div
                                                    key={kit.id}
                                                    className={`p-6 rounded-2xl border flex flex-col gap-6 relative overflow-hidden transition-all duration-300 group ${
                                                        isActive
                                                            ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/30"
                                                            : "bg-background border-border hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
                                                    }`}
                                                >
                                                    {/* Glow subtle if active */}
                                                    {isActive && (
                                                        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-50 dark:opacity-30">
                                                            <div className="absolute top-[-50px] right-[-50px] w-full h-full bg-indigo-400 rounded-full blur-[40px]"></div>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-start z-10">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-base text-foreground flex items-center gap-2">
                                                                {kit.name}
                                                                {isActive && (
                                                                    <div className="flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5 text-[10px] gap-1 border border-indigo-200 dark:border-indigo-800">
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        DEFAULT
                                                                    </div>
                                                                )}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground mt-1 font-medium">
                                                                Ditambahkan{" "}
                                                                {new Date(kit.created_at).toLocaleDateString("id-ID", {
                                                                    year: "numeric",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {kit.colors.map((c, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-black/10 dark:border-white/10 shadow-sm relative group/color cursor-crosshair transform transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:z-10 hover:shadow-md"
                                                                style={{ backgroundColor: c.hex }}
                                                            >
                                                                <div className="absolute opacity-0 group-hover/color:opacity-100 bg-zinc-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-md -top-11 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 translate-y-2 group-hover/color:translate-y-0 shadow-xl whitespace-nowrap z-50">
                                                                    {c.hex}
                                                                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-zinc-900"></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-border/50 z-10">
                                                        {!isActive ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-9 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 px-4 -ml-2 rounded-lg"
                                                                onClick={() => handleSetActiveBrandKit(kit.id)}
                                                            >
                                                                Set Default
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-muted-foreground px-2">
                                                                Sedang digunakan
                                                            </span>
                                                        )}

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors opacity-40 group-hover:opacity-100 focus:opacity-100"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="sm:max-w-md">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="flex items-center gap-2">
                                                                        <Trash2 className="w-5 h-5 text-destructive" />
                                                                        Hapus Brand Kit?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-base">
                                                                        Menghapus <strong>{kit.name}</strong> tidak dapat dibatalkan. Desain yang telah Anda buat sebelumnya dengan brand kit ini tidak akan terpengaruh.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="mt-6">
                                                                    <AlertDialogCancel className="font-medium">Batalkan</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDeleteBrandKit(kit.id)}
                                                                        className="bg-destructive hover:bg-destructive/90 text-white font-medium"
                                                                    >
                                                                        Ya, Hapus Palette
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
                    </SettingsSection>

                    {/* -- SECTION DANGER ZONE -- */}
                    <SettingsSection
                        title="Danger Zone"
                        description="Pengaturan sensitif. Menghapus akun Anda secara permanen beserta datanya."
                        icon={ShieldAlert}
                        isDanger={true}
                    >
                        <Card className="border-destructive/30 bg-destructive/[0.03] overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-foreground">Hapus Akun Permanen</h3>
                                        <p className="text-sm text-muted-foreground w-full sm:max-w-md leading-relaxed">
                                            Setelah Anda menghapus akun, seluruh data termasuk informasi profil, riwayat desain, dataset gambar buatan AI, serta kuota kredit akan segera dihapus permanen. Tindakan tidak dapat ditarik kembali.
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="shrink-0 group font-semibold shadow-sm">
                                                <Trash2 className="w-4 h-4 mr-2 opacity-80 group-hover:opacity-100" />
                                                Hapus Akun
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="border-destructive/30 sm:max-w-md border-t-4 border-t-destructive">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl">
                                                    <ShieldAlert className="w-6 h-6" />
                                                    Peringatan Keras
                                                </AlertDialogTitle>
                                                <AlertDialogDescription className="text-foreground/90 text-base mt-2">
                                                    Anda akan menghapus akun beserta sisa kredit dan semua desain Anda secara permanen. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <div className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-lg border border-destructive/20 my-4">
                                                Tip: Silahkan download karya favorit Anda sebelum melakukan ini.
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel disabled={isDeleting} className="font-medium">Batalkan</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDeleteAccount}
                                                    disabled={isDeleting}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                                                >
                                                    {isDeleting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Memproses Eksekusi...
                                                        </>
                                                    ) : "Ya, Hapus Selamanya"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    </SettingsSection>
                </div>
            </main>
        </div>
    );
}

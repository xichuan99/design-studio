"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useProjectApi, CreditTransaction } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
    ShieldAlert,
    Sparkles,
    Mail,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CalendarDays,
    Settings2,
    Image as ImageIcon,
    Type,
    Wand2,
    Gift,
    Receipt,
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

const getTransactionBadge = (description: string, amount: number) => {
    const desc = description.toLowerCase();
    
    if (desc.includes("ai image generation") || desc.includes("generate")) {
        return { label: "Generate", colorClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800", Icon: ImageIcon };
    }
    if (desc.includes("magic text")) {
        return { label: "Magic Text", colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800", Icon: Type };
    }
    if (desc.includes("background removal") || desc.includes("bg removal")) {
        return { label: "BG Remove", colorClass: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400 border-pink-200 dark:border-pink-800", Icon: Wand2 };
    }
    
    // Default types based on amount
    if (amount > 0) {
        return { label: "Kredit Masuk", colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", Icon: Gift };
    }
    
    return { label: "Kredit Keluar", colorClass: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800", Icon: Receipt };
};

export default function SettingsPage() {
    const { data: session, status: sessionStatus, update } = useSession();
    const router = useRouter();
    const api = useProjectApi();

    const [name, setName] = useState("");
    const [originalName, setOriginalName] = useState("");
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [provider, setProvider] = useState<string | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [totalUsedCredits, setTotalUsedCredits] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);

    // Credit History State
    const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const HISTORY_PAGE_SIZE = 20;

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
            setCreatedAt(profile.created_at || null);
            setProvider(profile.provider || null);
        } catch (err: unknown) {
            setError((err as Error).message || "Gagal memuat profil");
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCreditHistory = useCallback(async () => {
        try {
            setIsLoadingHistory(true);
            const historyData = await api.getCreditHistory(HISTORY_PAGE_SIZE, 0);
            setCreditHistory(historyData.transactions);
            setHasMoreHistory(historyData.transactions.length < historyData.total_count);
            
            // Calculate total used
            const used = historyData.transactions
                .filter(tx => tx.amount < 0)
                .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
            setTotalUsedCredits(used);
        } catch (err) {
            console.error("Failed to load credit history", err);
        } finally {
            setIsLoadingHistory(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadMoreHistory = async () => {
        try {
            setIsLoadingMore(true);
            const historyData = await api.getCreditHistory(HISTORY_PAGE_SIZE, creditHistory.length);
            setCreditHistory(prev => [...prev, ...historyData.transactions]);
            setHasMoreHistory(creditHistory.length + historyData.transactions.length < historyData.total_count);
        } catch (err) {
            console.error("Failed to load more credit history", err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchProfile();
            fetchCreditHistory();
        }
    }, [sessionStatus, fetchProfile, fetchCreditHistory]);

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
                                    <div className="flex flex-col sm:items-end gap-3 w-full sm:max-w-xs">
                                        <div className="text-5xl font-extrabold tracking-tighter text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950 px-8 py-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900 min-w-[140px] text-center w-fit self-start sm:self-end">
                                            {credits !== null ? credits : "-"}
                                        </div>
                                        
                                        {totalUsedCredits > 0 && credits !== null && (
                                            <div className="w-full sm:min-w-[200px] flex flex-col gap-1.5 mt-1 bg-white/50 dark:bg-zinc-950/50 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/50">
                                                <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
                                                    <span>Terpakai: {totalUsedCredits}</span>
                                                    <span>Total: {credits + totalUsedCredits}</span>
                                                </div>
                                                <div className="h-2 w-full bg-indigo-100 dark:bg-indigo-950/50 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ width: `${(totalUsedCredits / (credits + totalUsedCredits)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Transaction History Sub-section */}
                        <div className="mt-8">
                            <h4 className="font-semibold text-base mb-4 flex items-center gap-2 text-foreground">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Riwayat Transaksi
                            </h4>
                            
                            {isLoadingHistory ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500/50" />
                                </div>
                            ) : creditHistory.length === 0 ? (
                                <div className="text-center py-10 bg-muted/20 border border-dashed border-border/60 rounded-xl">
                                    <p className="text-sm text-muted-foreground">Belum ada riwayat transaksi.</p>
                                </div>
                            ) : (
                                <div className="rounded-xl border bg-card/50 overflow-hidden text-sm">
                                    {/* Desktop Table View */}
                                    <table className="w-full text-left hidden md:table">
                                        <thead className="bg-muted/30">
                                            <tr>
                                                <th className="py-3 px-4 font-medium text-muted-foreground w-[160px]">Tanggal</th>
                                                <th className="py-3 px-4 font-medium text-muted-foreground w-[140px]">Tipe</th>
                                                <th className="py-3 px-4 font-medium text-muted-foreground w-[120px]">Perubahan</th>
                                                <th className="py-3 px-4 font-medium text-muted-foreground w-[120px]">Sisa Kredit</th>
                                                <th className="py-3 px-4 font-medium text-muted-foreground">Deskripsi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {creditHistory.map((tx) => {
                                                const badge = getTransactionBadge(tx.description, tx.amount);
                                                const BadgeIcon = badge.Icon;
                                                return (
                                                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                                                            {new Date(tx.created_at).toLocaleString("id-ID", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.colorClass}`}>
                                                                <BadgeIcon className="w-3 h-3" />
                                                                {badge.label}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium">
                                                            {tx.amount > 0 ? (
                                                                <span className="text-emerald-500 flex items-center gap-1">
                                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                                    +{tx.amount}
                                                                </span>
                                                            ) : (
                                                                <span className="text-destructive flex items-center gap-1">
                                                                    <ArrowDownRight className="h-3.5 w-3.5" />
                                                                    {tx.amount}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 font-semibold text-foreground/80">
                                                            {tx.balance_after}
                                                        </td>
                                                        <td className="py-3 px-4 text-foreground/90">
                                                            {tx.description}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Mobile Cards View */}
                                    <div className="flex flex-col md:hidden divide-y divide-border/40">
                                        {creditHistory.map((tx) => {
                                            const badge = getTransactionBadge(tx.description, tx.amount);
                                            const BadgeIcon = badge.Icon;
                                            return (
                                                <div key={tx.id} className="p-4 flex gap-4 hover:bg-muted/10 transition-colors">
                                                    <div className={`mt-0.5 shrink-0 flex items-center justify-center w-8 h-8 rounded-full border ${badge.colorClass}`}>
                                                        <BadgeIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="space-y-0.5 min-w-0">
                                                                <p className="font-medium text-foreground text-sm truncate">
                                                                    {tx.description}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                                    {new Date(tx.created_at).toLocaleString("id-ID", {
                                                                        day: "2-digit",
                                                                        month: "short",
                                                                        year: "numeric",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-end shrink-0">
                                                                {tx.amount > 0 ? (
                                                                    <span className="text-emerald-500 font-medium flex items-center gap-0.5 text-sm">
                                                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                                                        +{tx.amount}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-destructive font-medium flex items-center gap-0.5 text-sm">
                                                                        <ArrowDownRight className="h-3.5 w-3.5" />
                                                                        {tx.amount}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-muted-foreground font-medium mt-0.5 bg-muted px-1.5 py-0.5 rounded">
                                                                    Sisa: {tx.balance_after}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Load More Button */}
                            {!isLoadingHistory && hasMoreHistory && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadMoreHistory}
                                        disabled={isLoadingMore}
                                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {isLoadingMore ? (
                                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Memuat...</>
                                        ) : (
                                            <>Muat Lebih Banyak ({creditHistory.length} ditampilkan)</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
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

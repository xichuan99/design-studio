"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useProjectApi } from "@/lib/api";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ShieldAlert, Trash2, Loader2 } from "lucide-react";

export function DangerZoneSection() {
    const router = useRouter();
    const api = useProjectApi();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <SettingsSection
            title="Danger Zone"
            description="Pengaturan sensitif. Menghapus akun Anda secara permanen beserta datanya."
            icon={ShieldAlert}
            isDanger={true}
        >
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-4 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <span>{error}</span>
                </div>
            )}
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
    );
}

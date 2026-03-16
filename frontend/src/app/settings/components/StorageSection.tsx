"use client";

import { useState, useEffect, useCallback } from "react";
import { useProjectApi, StorageUsage } from "@/lib/api";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive, Loader2, AlertCircle } from "lucide-react";

export function StorageSection() {
    const api = useProjectApi();
    const [storageInfo, setStorageInfo] = useState<StorageUsage | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);

    const fetchStorageInfo = useCallback(async () => {
        setStorageError(null);
        try {
            const data = await api.getStorageUsage();
            setStorageInfo(data);
        } catch (err) {
            console.error("Failed to load storage info", err);
            setStorageError("Gagal memuat informasi penyimpanan.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchStorageInfo();
    }, [fetchStorageInfo]);

    return (
        <SettingsSection
            title="Penyimpanan"
            description="Pantau penggunaan ruang penyimpanan file Anda antara lain gambar, logo brand, dan hasil AI."
            icon={HardDrive}
        >
            <Card className="shadow-sm border-teal-200/50 dark:border-teal-900/50 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
                <CardContent className="p-6 sm:p-8">
                    {storageError ? (
                        <div className="flex flex-col justify-center items-center py-8 space-y-4">
                            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                                <AlertCircle className="h-5 w-5" />
                                <span>{storageError}</span>
                            </div>
                            <button
                                onClick={fetchStorageInfo}
                                className="px-4 py-2 bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-colors text-sm font-medium"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : storageInfo ? (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                                            <HardDrive className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        Ruang Penyimpanan
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        File desain, logo, dan hasil dari AI tools akan mengurangi kuota penyimpanan.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:items-end gap-3 w-full sm:max-w-xs">
                                    <div className="text-3xl font-extrabold tracking-tighter text-teal-600 dark:text-teal-400 bg-white dark:bg-zinc-950 px-6 py-3 rounded-2xl shadow-sm border border-teal-100 dark:border-teal-900 text-center w-fit self-start sm:self-end">
                                        {storageInfo.used_mb} <span className="text-base font-semibold text-muted-foreground">/ {storageInfo.quota_mb} MB</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                    <span>Terpakai: {storageInfo.used_mb} MB ({storageInfo.percentage}%)</span>
                                    <span>Tersisa: {(storageInfo.quota_mb - storageInfo.used_mb).toFixed(2)} MB</span>
                                </div>
                                <div className="h-3 w-full bg-teal-100 dark:bg-teal-950/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            storageInfo.percentage >= 95
                                                ? "bg-destructive"
                                                : storageInfo.percentage >= 80
                                                ? "bg-orange-500"
                                                : storageInfo.percentage >= 60
                                                ? "bg-amber-500"
                                                : "bg-teal-500"
                                        }`}
                                        style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {storageInfo.percentage >= 80 && (
                                <div className={`text-sm font-medium p-3 rounded-lg border ${
                                    storageInfo.percentage >= 95
                                        ? "bg-destructive/10 text-destructive border-destructive/20"
                                        : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
                                }`}>
                                    {storageInfo.percentage >= 95
                                        ? "⚠️ Penyimpanan hampir penuh! Hapus file lama atau upgrade plan."
                                        : "💡 Penyimpanan mulai penuh. Pertimbangkan untuk menghapus file yang tidak dipakai."}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-500/50" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </SettingsSection>
    );
}

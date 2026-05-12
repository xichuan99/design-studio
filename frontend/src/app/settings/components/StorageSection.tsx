"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useProjectApi, StorageAddon, StorageUsage } from "@/lib/api";
import { StoragePurchaseItem } from "@/lib/api/types";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive, Loader2, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/events";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function StatusBadge({ status }: { status: string }) {
    if (status === "paid") {
        return (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Berhasil
            </Badge>
        );
    }
    if (status === "pending") {
        return (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1">
                <Clock className="h-3 w-3" />
                Menunggu
            </Badge>
        );
    }
    if (status === "failed" || status === "canceled") {
        return (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800 gap-1">
                <XCircle className="h-3 w-3" />
                {status === "canceled" ? "Dibatalkan" : "Gagal"}
            </Badge>
        );
    }
    if (status === "expired") {
        return (
            <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Kedaluwarsa
            </Badge>
        );
    }
    return <Badge variant="secondary">{status}</Badge>;
}

function PurchaseHistoryTable({ purchases }: { purchases: StoragePurchaseItem[] }) {
    if (purchases.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada riwayat pembelian storage.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Paket</th>
                        <th className="pb-2 pr-4 font-medium">Kapasitas</th>
                        <th className="pb-2 pr-4 font-medium">Harga</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Tanggal</th>
                    </tr>
                </thead>
                <tbody>
                    {purchases.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">
                                {p.addon_code === "storage_plus_5gb" ? "+5 GB" : p.addon_code === "storage_plus_20gb" ? "+20 GB" : p.addon_code}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{formatBytes(p.bytes_added)}</td>
                            <td className="py-2 pr-4 text-muted-foreground">
                                {p.currency} {p.amount.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2 pr-4">
                                <StatusBadge status={p.status} />
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">
                                {new Date(p.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const FALLBACK_ADDONS: StorageAddon[] = [
    {
        code: "storage_plus_5gb",
        label: "Tambah 5 GB",
        bytes_added: 5 * 1024 * 1024 * 1024,
        amount: 49000,
        currency: "IDR",
    },
    {
        code: "storage_plus_20gb",
        label: "Tambah 20 GB",
        bytes_added: 20 * 1024 * 1024 * 1024,
        amount: 149000,
        currency: "IDR",
    },
];

export function StorageSection() {
    const api = useProjectApi();
    const searchParams = useSearchParams();
    const posthog = usePostHog();

    const [storageInfo, setStorageInfo] = useState<StorageUsage | null>(null);
    const [storageAddons, setStorageAddons] = useState<StorageAddon[]>([]);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [isProcessingUpgrade, setIsProcessingUpgrade] = useState<string | null>(null);
    const [purchases, setPurchases] = useState<StoragePurchaseItem[]>([]);
    const [purchasesLoading, setPurchasesLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    // The purchase_id we are actively polling (set after checkout redirect return)
    const pollingPurchaseId = useRef<string | null>(null);
    const pollStartTime = useRef<number | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const fetchPurchases = useCallback(async () => {
        setPurchasesLoading(true);
        try {
            const data = await api.getStoragePurchases(10, 0);
            setPurchases(data.items);
            return data.items;
        } catch (err) {
            console.error("Failed to load purchase history", err);
            return null;
        } finally {
            setPurchasesLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Polling: check purchase status until paid/failed/expired or timeout
    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        setIsPolling(false);
        pollingPurchaseId.current = null;
        pollStartTime.current = null;
    }, []);

    const pollOnce = useCallback(async () => {
        const targetId = pollingPurchaseId.current;
        if (!targetId) return;

        const elapsed = Date.now() - (pollStartTime.current ?? Date.now());
        if (elapsed >= POLL_MAX_DURATION_MS) {
            stopPolling();
            toast.error("Konfirmasi pembayaran belum diterima. Silakan cek riwayat atau hubungi support.");
            return;
        }

        try {
            const items = await api.getStoragePurchases(10, 0);
            const target = items.items.find((p) => p.id === targetId);
            setPurchases(items.items);

            if (target && target.status !== "pending") {
                stopPolling();
                if (target.status === "paid") {
                    trackEvent(posthog, "payment_succeeded", {
                        source: "storage_settings",
                        product_code: target.addon_code,
                        amount: target.amount,
                        currency: target.currency,
                        purchase_id: target.id,
                        status: "succeeded",
                    });
                    toast.success("Pembayaran berhasil! Storage kamu sudah ditambahkan.");
                    await fetchStorageInfo();
                } else {
                    const failureStatus =
                        target.status === "expired" || target.status === "canceled" ? target.status : "failed";
                    trackEvent(posthog, "payment_failed", {
                        source: "storage_settings",
                        product_code: target.addon_code,
                        amount: target.amount,
                        currency: target.currency,
                        purchase_id: target.id,
                        status: failureStatus,
                    });
                    toast.error(`Pembayaran ${target.status === "expired" ? "kedaluwarsa" : "gagal"}. Silakan coba lagi.`);
                }
                return;
            }
        } catch (err) {
            console.error("Poll error", err);
        }

        // Schedule next poll
        pollTimerRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopPolling, fetchStorageInfo, posthog]);

    const startPolling = useCallback(
        (purchaseId: string) => {
            pollingPurchaseId.current = purchaseId;
            pollStartTime.current = Date.now();
            setIsPolling(true);
            pollTimerRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
        },
        [pollOnce]
    );

    // Detect post-checkout return: ?purchase_id=xxx in URL
    useEffect(() => {
        const purchaseId = searchParams.get("purchase_id");
        if (purchaseId && !pollingPurchaseId.current) {
            toast.info("Memverifikasi status pembayaran...");
            startPolling(purchaseId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, []);

    useEffect(() => {
        fetchStorageInfo();
    }, [fetchStorageInfo]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    useEffect(() => {
        const fetchStorageAddons = async () => {
            try {
                const data = await api.getStorageAddons();
                setStorageAddons(data.items);
            } catch (err) {
                console.error("Failed to load storage addon catalog", err);
            }
        };

        fetchStorageAddons();
    }, [api]);

    const handleUpgrade = useCallback(async (addonCode: string) => {
        setIsProcessingUpgrade(addonCode);
        const addon = (storageAddons.length > 0 ? storageAddons : FALLBACK_ADDONS).find((item) => item.code === addonCode);
        try {
            if (addon) {
                trackEvent(posthog, "payment_started", {
                    source: "storage_settings",
                    product_code: addon.code,
                    amount: addon.amount,
                    currency: addon.currency,
                });
            }
            const intent = await api.createStoragePurchaseIntent({ addon_code: addonCode as "storage_plus_5gb" | "storage_plus_20gb" });
            toast.success("Checkout siap. Mengarahkan ke halaman pembayaran...");
            window.location.href = intent.checkout_url;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal membuat sesi pembayaran storage.";
            trackEvent(posthog, "payment_failed", {
                source: "storage_settings",
                product_code: addon?.code,
                amount: addon?.amount,
                currency: addon?.currency,
                status: "failed",
                error_message: message,
            });
            toast.error(message);
        } finally {
            setIsProcessingUpgrade(null);
        }
    }, [api, posthog, storageAddons]);

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
                            {/* Usage summary */}
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

                            {/* Usage bar */}
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

                            {/* Capacity warning */}
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

                            {/* Payment-in-progress banner */}
                            {isPolling && (
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium">
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                    Memverifikasi pembayaran... Halaman akan diperbarui otomatis.
                                </div>
                            )}

                            {/* Upgrade CTA */}
                            <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-4 bg-white/70 dark:bg-zinc-950/40">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                    <p className="text-sm font-semibold text-foreground">Upgrade Storage</p>
                                    <p className="text-xs text-muted-foreground">Aktif segera setelah pembayaran terkonfirmasi.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(storageAddons.length > 0 ? storageAddons : FALLBACK_ADDONS).map((addon, index) => (
                                        <Button
                                            key={addon.code}
                                            variant={index === 0 ? "outline" : "default"}
                                            disabled={isProcessingUpgrade !== null || isPolling}
                                            onClick={() => handleUpgrade(addon.code)}
                                        >
                                            {isProcessingUpgrade === addon.code
                                                ? "Memproses..."
                                                : `${addon.label} - ${addon.currency} ${addon.amount.toLocaleString("id-ID")}`}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Purchase history */}
                            <div className="rounded-lg border border-border p-4 bg-white/50 dark:bg-zinc-950/30">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-foreground">Riwayat Pembelian</p>
                                    {purchasesLoading && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                <PurchaseHistoryTable purchases={purchases} />
                            </div>
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

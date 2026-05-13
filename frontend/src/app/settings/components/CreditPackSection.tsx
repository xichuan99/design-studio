"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useProjectApi, CreditPurchaseItem } from "@/lib/api";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/events";
import type { CreditPack, CreditPackCode } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
            <Badge className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-400 border-destructive/30 gap-1">
                <XCircle className="h-3 w-3" />
                {status === "failed" ? "Gagal" : "Dibatalkan"}
            </Badge>
        );
    }
    if (status === "expired") {
        return (
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800 gap-1">
                <Clock className="h-3 w-3" />
                Kedaluwarsa
            </Badge>
        );
    }
    return <Badge>{status}</Badge>;
}

function PurchaseHistoryTable({ purchases }: { purchases: CreditPurchaseItem[] }) {
    if (purchases.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada riwayat pembelian kredit.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Paket</th>
                        <th className="pb-2 pr-4 font-medium">Kredit</th>
                        <th className="pb-2 pr-4 font-medium">Harga</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Tanggal</th>
                    </tr>
                </thead>
                <tbody>
                    {purchases.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">
                                {p.pack_code === "credit_pack_starter"
                                    ? "Starter (100)"
                                    : p.pack_code === "credit_pack_pro"
                                    ? "Pro (500)"
                                    : p.pack_code === "credit_pack_business"
                                    ? "Business (2000)"
                                    : p.pack_code}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{p.credits_added}</td>
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

export function CreditPackSection() {
    const api = useProjectApi();
    const searchParams = useSearchParams();
    const posthog = usePostHog();

    const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
    const [isProcessingPurchase, setIsProcessingPurchase] = useState<string | null>(null);
    const [purchases, setPurchases] = useState<CreditPurchaseItem[]>([]);
    const [purchasesLoading, setPurchasesLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    // The purchase_id we are actively polling (set after checkout redirect return)
    const pollingPurchaseId = useRef<string | null>(null);
    const pollStartTime = useRef<number | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchCatalog = useCallback(async () => {
        try {
            const data = await api.getCreditPackCatalog();
            setCreditPacks(data.items);
        } catch (err) {
            console.error("Failed to load credit pack catalog", err);
        }
    }, [api]);

    const fetchPurchases = useCallback(async () => {
        setPurchasesLoading(true);
        try {
            const data = await api.getCreditPurchases(10, 0);
            setPurchases(data.items);
            return data.items;
        } catch (err) {
            console.error("Failed to load purchase history", err);
            return null;
        } finally {
            setPurchasesLoading(false);
        }
    }, [api]);

    // Polling: check purchase status until paid/failed/expired or timeout
    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        setIsPolling(false);
        pollingPurchaseId.current = null;
        pollStartTime.current = null;
    }, []);

    const startPolling = useCallback(
        (purchaseId: string) => {
            pollingPurchaseId.current = purchaseId;
            pollStartTime.current = Date.now();
            setIsPolling(true);

            pollTimerRef.current = setInterval(async () => {
                try {
                    const items = await fetchPurchases();
                    if (!items) return;

                    const purchase = items.find((p) => p.id === purchaseId);
                    if (!purchase) return;

                    if (purchase.status === "paid") {
                        trackEvent(posthog, "payment_succeeded", {
                            source: "credits_settings",
                            product_code: purchase.pack_code,
                            amount: purchase.amount,
                            currency: purchase.currency,
                            purchase_id: purchase.id,
                            status: "succeeded",
                        });
                        toast.success(
                            `Pembayaran berhasil! ${purchase.credits_added} kredit sudah ditambahkan ke akun Anda.`
                        );
                        stopPolling();

                        // Refresh user credits
                        try {
                            const user = await api.getUserProfile();
                            void user.credits_remaining;
                        } catch (e) {
                            console.error("Failed to refresh user credits", e);
                        }
                    } else if (purchase.status === "failed" || purchase.status === "canceled" || purchase.status === "expired") {
                        const failureStatus =
                            purchase.status === "expired" || purchase.status === "canceled"
                                ? purchase.status
                                : "failed";
                        trackEvent(posthog, "payment_failed", {
                            source: "credits_settings",
                            product_code: purchase.pack_code,
                            amount: purchase.amount,
                            currency: purchase.currency,
                            purchase_id: purchase.id,
                            status: failureStatus,
                        });
                        toast.error(
                            `Pembayaran ${
                                purchase.status === "expired" ? "kedaluwarsa" : "gagal"
                            }. Silakan coba lagi.`
                        );
                        stopPolling();
                    } else if (Date.now() - (pollStartTime.current || 0) > POLL_MAX_DURATION_MS) {
                        // Timeout: stop polling even if pending
                        stopPolling();
                        toast.info("Pembayaran masih dalam proses. Silakan kembali nanti untuk memeriksa status.");
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, POLL_INTERVAL_MS);
        },
        [api, posthog, fetchPurchases, stopPolling]
    );

    // On mount: fetch catalog and purchases
    useEffect(() => {
        fetchCatalog();
        fetchPurchases();
    }, [fetchCatalog, fetchPurchases]);

    // Check if we're returning from Midtrans checkout
    useEffect(() => {
        const purchaseIdFromUrl = searchParams.get("credit_purchase_id");
        if (purchaseIdFromUrl && !isPolling) {
            startPolling(purchaseIdFromUrl);
        }
        return () => {
            if (purchaseIdFromUrl && isPolling && pollTimerRef.current) {
                stopPolling();
            }
        };
    }, [searchParams, isPolling, startPolling, stopPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    const handlePurchase = useCallback(
        async (packCode: string) => {
            setIsProcessingPurchase(packCode);
            const pack = creditPacks.find((p) => p.code === packCode);
            if (!pack) {
                const message = "Paket kredit tidak ditemukan.";
                trackEvent(posthog, "payment_failed", {
                    source: "credits_settings",
                    product_code: packCode,
                    status: "failed",
                    error_message: message,
                });
                toast.error(message);
                setIsProcessingPurchase(null);
                return;
            }
            try {
                trackEvent(posthog, "payment_started", {
                    source: "credits_settings",
                    product_code: packCode,
                    amount: pack.amount,
                    currency: pack.currency,
                });

                const intent = await api.createCreditPurchaseIntent({
                    pack_code: packCode as CreditPackCode,
                });
                toast.success("Checkout siap. Mengarahkan ke halaman pembayaran...");

                // Set purchase_id in URL so on return we can poll it
                const checkoutUrl = new URL(intent.checkout_url);
                checkoutUrl.searchParams.set("credit_purchase_id", intent.purchase_id);
                window.location.href = checkoutUrl.toString();
            } catch (err) {
                const message = err instanceof Error ? err.message : "Gagal membuat sesi pembayaran kredit.";
                trackEvent(posthog, "payment_failed", {
                    source: "credits_settings",
                    product_code: packCode,
                    amount: pack?.amount,
                    currency: pack?.currency,
                    status: "failed",
                    error_message: message,
                });
                toast.error(message);
            } finally {
                setIsProcessingPurchase(null);
            }
        },
        [api, posthog, creditPacks]
    );

    return (
        <SettingsSection
            title="Kredit AI"
            description="Beli kredit AI untuk generasi gambar, hapus background, dan fitur AI lainnya. Hemat dengan paket lebih besar."
            icon={Zap}
        >
            <Card className="shadow-sm border-purple-200/50 dark:border-purple-900/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                <CardContent className="p-6 sm:p-8">
                    {/* Payment-in-progress banner */}
                    {isPolling && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium mb-6">
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                            Memverifikasi pembayaran... Halaman akan diperbarui otomatis.
                        </div>
                    )}

                    {/* Credit Packs Display */}
                    <div className="rounded-lg border border-purple-200 dark:border-purple-900 p-4 bg-white/70 dark:bg-zinc-950/40 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <p className="text-sm font-semibold text-foreground">Paket Kredit AI</p>
                            <p className="text-xs text-muted-foreground">Aktif segera setelah pembayaran terkonfirmasi.</p>
                        </div>

                        {creditPacks.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {creditPacks.map((pack, index) => (
                                    <div
                                        key={pack.code}
                                        className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
                                            index === 1
                                                ? "border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/30"
                                                : "border-border bg-card hover:border-purple-300 dark:hover:border-purple-700"
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <p className="font-semibold text-foreground">{pack.label}</p>
                                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                {pack.credits}
                                            </p>
                                            <p className="text-sm text-muted-foreground">kredit AI</p>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold text-foreground">
                                                {pack.currency} {pack.amount.toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                        <Button
                                            onClick={() => handlePurchase(pack.code)}
                                            disabled={isProcessingPurchase !== null || isPolling}
                                            variant={index === 1 ? "default" : "outline"}
                                            className={
                                                index === 1
                                                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                    : ""
                                            }
                                        >
                                            {isProcessingPurchase === pack.code ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Memproses...
                                                </>
                                            ) : (
                                                "Beli Sekarang"
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-purple-500/50 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Memuat paket kredit...</p>
                            </div>
                        )}
                    </div>

                    {/* Purchase history */}
                    <div className="rounded-lg border border-border p-4 bg-white/50 dark:bg-zinc-950/30">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-foreground">Riwayat Pembelian Kredit</p>
                            {purchasesLoading && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                        </div>
                        <PurchaseHistoryTable purchases={purchases} />
                    </div>
                </CardContent>
            </Card>
        </SettingsSection>
    );
}

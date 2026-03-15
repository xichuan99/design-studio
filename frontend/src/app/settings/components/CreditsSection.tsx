"use client";

import { useState, useEffect, useCallback } from "react";
import { useProjectApi, CreditTransaction } from "@/lib/api";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Sparkles,
    Coins,
    Clock,
    Loader2,
    ImageIcon,
    Type,
    Wand2,
    Gift,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";

const getTransactionBadge = (description: string, amount: number) => {
    const desc = description.toLowerCase();
    
    if (desc.includes("ai image generation") || desc.includes("generate") || desc.includes("desain")) {
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

export function CreditsSection() {
    const api = useProjectApi();
    const [credits, setCredits] = useState<number | null>(null);
    const [totalUsedCredits, setTotalUsedCredits] = useState(0);

    // Credit History State
    const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const HISTORY_PAGE_SIZE = 20;

    const fetchProfileAndHistory = useCallback(async () => {
        try {
            const profile = await api.getUserProfile();
            setCredits(profile.credits_remaining);
            
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

    useEffect(() => {
        fetchProfileAndHistory();
    }, [fetchProfileAndHistory]);

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

    return (
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
    );
}

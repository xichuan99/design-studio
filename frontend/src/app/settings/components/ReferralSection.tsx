"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, CheckCircle2, Copy, Users } from "lucide-react";
import { useProjectApi, type ReferralStatusResponse } from "@/lib/api";
import { SettingsSection } from "./SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ReferralSection() {
    const api = useProjectApi();
    const [status, setStatus] = useState<ReferralStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [applyCode, setApplyCode] = useState("");
    const [isApplying, setIsApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await api.getReferralStatus();
            setStatus(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat status referral");
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        void fetchStatus();
    }, [fetchStatus]);

    const handleApply = async () => {
        const code = applyCode.trim().toUpperCase();
        if (!code) {
            setError("Kode referral wajib diisi.");
            return;
        }

        try {
            setIsApplying(true);
            setError(null);
            setSuccess(null);
            const res = await api.applyReferralCode({ code });
            setSuccess(res.message);
            setApplyCode("");
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menerapkan kode referral");
        } finally {
            setIsApplying(false);
        }
    };

    const handleCopyCode = async () => {
        if (!status?.referral_code) return;
        try {
            await navigator.clipboard.writeText(status.referral_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setError("Gagal menyalin kode referral.");
        }
    };

    const totalReferrals = (status?.summary.pending_count ?? 0) + (status?.summary.verified_count ?? 0);

    return (
        <SettingsSection
            title="Referral"
            description="Ajak teman, dapat bonus kredit setelah akun mereka terverifikasi aktif."
            icon={Gift}
        >
            <Card className="shadow-sm border-border/60 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 space-y-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-lg border p-3 bg-muted/20">
                                    <p className="text-xs text-muted-foreground">Total referral</p>
                                    <p className="mt-1 text-xl font-semibold">{totalReferrals}</p>
                                </div>
                                <div className="rounded-lg border p-3 bg-muted/20">
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                    <p className="mt-1 text-xl font-semibold">{status?.summary.pending_count ?? 0}</p>
                                </div>
                                <div className="rounded-lg border p-3 bg-muted/20">
                                    <p className="text-xs text-muted-foreground">Kredit dari referral</p>
                                    <p className="mt-1 text-xl font-semibold">{status?.summary.credits_earned_total ?? 0}</p>
                                </div>
                            </div>

                            <div className="space-y-2 rounded-lg border p-4 bg-background">
                                <p className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Kode referral kamu</p>
                                <div className="flex gap-2">
                                    <Input value={status?.referral_code ?? ""} readOnly />
                                    <Button type="button" variant="outline" onClick={handleCopyCode} disabled={!status?.referral_code}>
                                        <Copy className="h-4 w-4 mr-1" />
                                        {copied ? "Tersalin" : "Salin"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Bonus per referral terverifikasi: 10 kredit.</p>
                            </div>

                            <div className="space-y-2 rounded-lg border p-4 bg-background">
                                <p className="text-sm font-medium">Pakai kode referral teman</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Contoh: ABCD1234"
                                        value={applyCode}
                                        onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                                        disabled={isApplying}
                                    />
                                    <Button type="button" onClick={handleApply} disabled={isApplying}>
                                        {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terapkan"}
                                    </Button>
                                </div>
                                {status?.applied_referral && (
                                    <p className="text-xs text-muted-foreground">
                                        Referral aktif: {status.applied_referral.referrer_name} ({status.applied_referral.status}).
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {success && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> {success}
                        </p>
                    )}
                </CardContent>
            </Card>
        </SettingsSection>
    );
}

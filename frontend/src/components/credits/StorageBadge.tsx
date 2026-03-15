"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { HardDrive } from "lucide-react";
import { useProjectApi, StorageUsage } from "@/lib/api";

export const StorageBadge = () => {
    const { status } = useSession();
    const { getStorageUsage } = useProjectApi();
    const [storage, setStorage] = useState<StorageUsage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "authenticated") {
            const fetchStorage = async () => {
                try {
                    const data = await getStorageUsage();
                    setStorage(data);
                } catch (error) {
                    console.error("Failed to fetch storage", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchStorage();
        } else {
            setLoading(false);
        }
    }, [status, getStorageUsage]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm animate-pulse">
                <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
                <div className="w-16 h-3 rounded bg-muted-foreground/20" />
            </div>
        );
    }

    if (!storage) return null;

    const pct = storage.percentage;
    let badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    let iconColor = "text-emerald-600 dark:text-emerald-400";
    let barColor = "bg-emerald-500";

    if (pct >= 95) {
        badgeColor = "bg-destructive/10 text-destructive border-destructive/30";
        iconColor = "text-destructive";
        barColor = "bg-destructive";
    } else if (pct >= 80) {
        badgeColor = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
        iconColor = "text-orange-600 dark:text-orange-400";
        barColor = "bg-orange-500";
    } else if (pct >= 60) {
        badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        iconColor = "text-amber-600 dark:text-amber-400";
        barColor = "bg-amber-500";
    }

    const label = storage.used_mb >= 1
        ? `${storage.used_mb} MB`
        : `${Math.round(storage.used / 1024)} KB`;

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${badgeColor}`}
            title={`${storage.used_mb} MB / ${storage.quota_mb} MB (${pct}%)`}
        >
            <HardDrive className={`h-3.5 w-3.5 ${iconColor}`} />
            <div className="flex items-center gap-2">
                <span className="text-xs">{label}</span>
                <div className="w-12 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

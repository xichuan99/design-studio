"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Coins } from "lucide-react";
import { useProjectApi } from "@/lib/api";

export const CreditBadge = () => {
    const { status } = useSession();
    const { getUserProfile } = useProjectApi();
    const [credits, setCredits] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "authenticated") {
            const fetchCredits = async () => {
                try {
                    const profile = await getUserProfile();
                    setCredits(profile.credits_remaining);
                } catch (error) {
                    console.error("Failed to fetch credits", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchCredits();
        } else {
            setLoading(false);
        }
    }, [status, getUserProfile]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm animate-pulse">
                <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
                <div className="w-12 h-3 rounded bg-muted-foreground/20" />
            </div>
        );
    }

    if (credits === null) return null;

    let badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    let iconColor = "text-amber-600 dark:text-amber-400";
    let animationClass = "";

    if (credits === 0) {
        badgeColor = "bg-destructive/10 text-destructive border-destructive/30";
        iconColor = "text-destructive";
        animationClass = "animate-pulse";
    } else if (credits <= 5) {
        badgeColor = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
        iconColor = "text-orange-600 dark:text-orange-400";
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${badgeColor} ${animationClass}`}>
            <Coins className={`h-4 w-4 ${iconColor}`} />
            <span>{credits} Credits</span>
        </div>
    );
};

import React, { useMemo, useState } from "react";
import { ChevronDown, Lock, Sparkles } from "lucide-react";

import type { ModelCatalogItem, ModelTier } from "@/lib/api";

const TIER_SUBTITLES: Record<string, string> = {
    basic: "⚡ Cepat & Murah — konten harian",
    pro: "🔧 Kualitas Harian — detail rapi",
    ultra: "🔥 Kualitas Premium — campaign penting",
    auto: "🤖 Biar kami yang pilihkan",
};

interface ModelSelectorProps {
    value: ModelTier;
    onChange: (value: ModelTier) => void;
    items: ModelCatalogItem[];
    isInputLocked: boolean;
    onOpenAdvanced: () => void;
    onSelectTier: (value: ModelTier) => void;
}

export function ModelSelector({
    value,
    onChange,
    items,
    isInputLocked,
    onOpenAdvanced,
    onSelectTier,
}: ModelSelectorProps) {
    const [expanded, setExpanded] = useState(false);

    const defaultItem = useMemo(
        () => items.find((item) => item.tier === value) ?? items.find((item) => item.default_for_user) ?? items[0],
        [items, value]
    );

    const advancedItems = useMemo(
        () => items.filter((item) => item.tier !== "auto"),
        [items]
    );

    const handleToggle = () => {
        const nextExpanded = !expanded;
        setExpanded(nextExpanded);
        if (nextExpanded) {
            onOpenAdvanced();
        }
    };

    const handleSelect = (tier: ModelTier) => {
        if (tier === value) {
            return;
        }
        onChange(tier);
        onSelectTier(tier);
    };

    return (
        <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">Model AI</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Mulai dari Auto untuk pilihan aman. Buka opsi lanjutan jika ingin mengatur kualitas secara eksplisit.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={isInputLocked}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Opsi Lanjutan
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
            </div>

            {defaultItem && (
                <button
                    type="button"
                    disabled={isInputLocked}
                    onClick={() => handleSelect("auto")}
                    className={`mt-3 w-full rounded-xl border p-3 text-left transition-colors ${
                        value === "auto"
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-background hover:bg-muted"
                    } ${isInputLocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">Auto</span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{TIER_SUBTITLES.auto}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{defaultItem.description}</p>
                        </div>
                        {defaultItem.default_for_user && (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                Default akun Kamu
                            </span>
                        )}
                    </div>
                </button>
            )}

            {expanded && (
                <div className="mt-3 grid gap-2">
                    {advancedItems.map((item) => {
                        const isSelected = value === item.tier;
                        return (
                            <button
                                key={item.tier}
                                type="button"
                                disabled={isInputLocked || !item.accessible}
                                onClick={() => handleSelect(item.tier)}
                                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                    isSelected
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-border bg-background hover:bg-muted"
                                } ${!item.accessible ? "opacity-70" : ""} ${isInputLocked ? "cursor-not-allowed" : ""}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">{item.label}</span>
                                            {!item.accessible && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </div>
                                        {TIER_SUBTITLES[item.tier] && (
                                            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                                                {TIER_SUBTITLES[item.tier]}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                                        {!item.accessible && item.reason && (
                                            <p className="mt-2 text-[11px] font-medium text-amber-600">{item.reason}</p>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                            Dipilih
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ArrowRight, ShoppingBag, Instagram, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DESIGN_BRIEF_SESSION_KEY } from "@/lib/design-brief-session";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SellerChannel =
    | "shopee"
    | "tokopedia"
    | "instagram"
    | "instagram_story"
    | "whatsapp"
    | "general";

export type PromoType =
    | "new_product"
    | "flash_sale"
    | "discount"
    | "hampers"
    | "bundle"
    | "routine";

// ─────────────────────────────────────────────────────────────────────────────
// Config maps
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<SellerChannel, { label: string; description: string; aspectRatio: string; briefChannel: string; style: string }> = {
    shopee: {
        label: "Shopee",
        description: "Foto produk & banner flash sale",
        aspectRatio: "1:1-shopee",
        briefChannel: "marketplace",
        style: "Bold marketplace",
    },
    tokopedia: {
        label: "Tokopedia",
        description: "Thumbnail & promo produk unggulan",
        aspectRatio: "1:1-tokped",
        briefChannel: "marketplace",
        style: "Bold marketplace",
    },
    instagram: {
        label: "Instagram Feed",
        description: "Post 4:5 untuk feed Instagram",
        aspectRatio: "4:5",
        briefChannel: "instagram",
        style: "Minimal clean",
    },
    instagram_story: {
        label: "Instagram Story",
        description: "Story & Reels 9:16",
        aspectRatio: "9:16",
        briefChannel: "instagram",
        style: "Minimal clean",
    },
    whatsapp: {
        label: "WhatsApp Broadcast",
        description: "Gambar promo untuk status & blast",
        aspectRatio: "9:16",
        briefChannel: "ads",
        style: "Bold marketplace",
    },
    general: {
        label: "Semua / Lainnya",
        description: "Format fleksibel sesuai kebutuhan",
        aspectRatio: "1:1",
        briefChannel: "marketplace",
        style: "Professional tech",
    },
};

const PROMO_CONFIG: Record<PromoType, { label: string; goal: "promo" | "catalog"; notesTemplate: string }> = {
    new_product: {
        label: "Produk Baru",
        goal: "promo",
        notesTemplate: "Pengumuman produk baru. Tampilkan produk dengan visual yang bersih dan eye-catching. CTA ajak follow/order.",
    },
    flash_sale: {
        label: "Flash Sale",
        goal: "promo",
        notesTemplate: "Flash sale terbatas. Tampilkan harga coret, harga diskon, dan timer urgensi. CTA: Beli Sekarang.",
    },
    discount: {
        label: "Diskon %",
        goal: "promo",
        notesTemplate: "Promo diskon persentase. Perlihatkan angka diskon besar di tengah, sertakan syarat dan ketentuan singkat.",
    },
    hampers: {
        label: "Hampers / Parcel",
        goal: "promo",
        notesTemplate: "Hampers premium untuk hari raya atau acara spesial. Tampilkan isi hampers dengan estetika mewah dan elegan.",
    },
    bundle: {
        label: "Bundle Deal",
        goal: "promo",
        notesTemplate: "Paket bundle hemat: beli lebih banyak, hemat lebih besar. Tunjukkan semua produk yang termasuk dalam bundle.",
    },
    routine: {
        label: "Konten Rutin",
        goal: "catalog",
        notesTemplate: "Konten pemasaran rutin untuk channel ini. Tampilkan produk dengan gaya visual yang konsisten dan profesional.",
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: SellerChannel }) {
    const iconClass = "w-6 h-6";
    switch (channel) {
        case "shopee":
            return <ShoppingBag className={iconClass} />;
        case "tokopedia":
            return <Store className={iconClass} />;
        case "instagram":
        case "instagram_story":
            return <Instagram className={iconClass} />;
        case "whatsapp":
            return <MessageCircle className={iconClass} />;
        default:
            return <ShoppingBag className={iconClass} />;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function SellerChannelWizard() {
    const router = useRouter();
    const posthog = usePostHog();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedChannel, setSelectedChannel] = useState<SellerChannel | null>(null);

    const handleChannelSelect = (channel: SellerChannel) => {
        setSelectedChannel(channel);
        posthog?.capture("seller_wizard_channel_selected", { channel });
        setStep(2);
    };

    const handlePromoSelect = (promoType: PromoType) => {
        if (!selectedChannel) return;

        const channelCfg = CHANNEL_CONFIG[selectedChannel];
        const promoCfg = PROMO_CONFIG[promoType];

        posthog?.capture("seller_wizard_promo_selected", {
            channel: selectedChannel,
            promo_type: promoType,
            aspect_ratio: channelCfg.aspectRatio,
        });

        // Pre-fill the design brief session so the preview page can use it
        const prefilledBrief = {
            goal: promoCfg.goal,
            productType: "Produk",
            style: channelCfg.style,
            channel: channelCfg.briefChannel,
            copyTone: "Persuasif",
            notes: promoCfg.notesTemplate,
            useAiCopyAssist: true,
            aspectRatio: channelCfg.aspectRatio,
            sellerChannel: selectedChannel,
            promoType,
            updatedAt: new Date().toISOString(),
        };

        window.sessionStorage.setItem(DESIGN_BRIEF_SESSION_KEY, JSON.stringify(prefilledBrief));

        // Go to the interview form so the user can review / refine before generating
        router.push(`/design/new/interview?from=seller&channel=${selectedChannel}&promo=${promoType}`);
    };

    const channels: SellerChannel[] = ["shopee", "tokopedia", "instagram", "instagram_story", "whatsapp", "general"];
    const promoTypes: PromoType[] = ["new_product", "flash_sale", "discount", "hampers", "bundle", "routine"];

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animation-fade-in">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`font-semibold ${step === 1 ? "text-primary" : ""}`}>1. Pilih Platform</span>
                <ArrowRight className="w-3 h-3" />
                <span className={`font-semibold ${step === 2 ? "text-primary" : ""}`}>2. Jenis Promosi</span>
            </div>

            {/* Step 1 — Channel */}
            {step === 1 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">Kamu jualan di mana?</h2>
                    <p className="text-muted-foreground text-sm">Pilih platform utama untuk desain ini — ukuran dan gaya akan otomatis disesuaikan.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {channels.map((channel) => {
                            const cfg = CHANNEL_CONFIG[channel];
                            return (
                                <button
                                    key={channel}
                                    type="button"
                                    onClick={() => handleChannelSelect(channel)}
                                    className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                                        <ChannelIcon channel={channel} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">{cfg.label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Step 2 — Promo Type */}
            {step === 2 && selectedChannel && (
                <div className="space-y-4">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setStep(1)}
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Kembali
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ChannelIcon channel={selectedChannel} />
                        </div>
                        <span className="font-semibold text-foreground">{CHANNEL_CONFIG[selectedChannel].label}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Jenis promosinya apa?</h2>
                    <p className="text-muted-foreground text-sm">Brief akan otomatis disiapkan berdasarkan pilihan ini — kamu bisa ubah sebelum dibuat.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {promoTypes.map((promoType) => {
                            const cfg = PROMO_CONFIG[promoType];
                            return (
                                <Button
                                    key={promoType}
                                    variant="outline"
                                    className="h-auto flex-col items-start gap-1 rounded-2xl px-4 py-4 text-left hover:border-primary hover:bg-primary/5"
                                    onClick={() => handlePromoSelect(promoType)}
                                >
                                    <span className="font-semibold text-sm">{cfg.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

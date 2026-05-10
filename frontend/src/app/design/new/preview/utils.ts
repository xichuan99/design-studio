import type { DesignBriefSessionState } from "@/lib/design-brief-session";

export const ASPECT_RATIO_MAP: Record<string, string> = {
    instagram: "1:1",
    marketplace: "1:1",
    ads: "9:16",
};

export const GOAL_LABEL_MAP: Record<string, string> = {
    promo: "promosi produk yang menarik dan engaging",
    catalog: "katalog produk yang profesional dan rapi",
    ads: "iklan performa yang eye-catching dan persuasif",
};

export const CHANNEL_LABEL_MAP: Record<string, string> = {
    instagram: "Instagram feed",
    marketplace: "halaman produk marketplace",
    ads: "Google / Meta Ads",
};

export const PRODUCT_TYPE_LABEL_MAP: Record<string, string> = {
    "Makanan & Minuman": "produk makanan/minuman",
    Fashion: "produk fashion",
    Beauty: "produk beauty",
    Elektronik: "produk elektronik",
    "Rumah Tangga": "produk rumah tangga",
    Lainnya: "produk umum",
};

export const GEN_STATUS_LABELS = [
    "Menyiapkan komposisi visual...",
    "Menentukan palet warna...",
    "Membuat layout...",
    "Menambahkan detail desain...",
    "Hampir selesai...",
];

export function mapCopyToneToCatalogTone(copyTone: string): "formal" | "fun" | "premium" | "soft_selling" {
    if (copyTone === "Premium") return "premium";
    if (copyTone === "Friendly") return "fun";
    if (copyTone === "Edukatif") return "formal";
    return "soft_selling";
}

export function buildPrompt(brief: DesignBriefSessionState): string {
    const goalLabel = GOAL_LABEL_MAP[brief.goal] ?? brief.goal;
    const channelLabel = CHANNEL_LABEL_MAP[brief.channel] ?? brief.channel;
    const productTypeLabel = brief.productName || brief.customProductType || PRODUCT_TYPE_LABEL_MAP[brief.productType] || brief.productType;
    const noteLine = brief.notes ? `Catatan tambahan: ${brief.notes}.` : null;
    const catalogLine = brief.goal === "catalog" && brief.catalogTotalPages
        ? `Rancang sebagai katalog ${brief.catalogType ?? "product"} dengan ${brief.catalogTotalPages} halaman.`
        : null;
    const manualCopyLine = [
        brief.headlineOverride ? `Headline utama: ${brief.headlineOverride}.` : null,
        brief.subHeadlineOverride ? `Sub-headline: ${brief.subHeadlineOverride}.` : null,
        brief.ctaOverride ? `CTA: ${brief.ctaOverride}.` : null,
        brief.offerText ? `Offer penting: ${brief.offerText}.` : null,
    ].filter(Boolean).join(" ");
    const copyAssistLine = brief.useAiCopyAssist === false
        ? "Gunakan copy manual sebagai source of truth, jangan menambahkan alternatif copy AI."
        : null;
    return [
        `Buat desain ${goalLabel} untuk ${channelLabel} dengan konteks ${productTypeLabel}.`,
        catalogLine,
        `Gaya visual: ${brief.style}.`,
        `Tone copy: ${brief.copyTone}.`,
        manualCopyLine,
        copyAssistLine,
        noteLine,
        "Gunakan komposisi visual yang bersih, hierarki teks yang jelas, dan siap diedit di editor.",
    ].filter(Boolean).join(" ");
}

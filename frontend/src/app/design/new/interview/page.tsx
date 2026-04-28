"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Megaphone, Package2, Palette, ShoppingBag, Smartphone, X } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DESIGN_BRIEF_SESSION_KEY } from "@/lib/design-brief-session";
import { useProjectApi } from "@/lib/api";
import type { CatalogGoal } from "@/lib/api/types";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const goals = [
    { id: "promo", label: "Promo cepat", icon: Megaphone },
    { id: "catalog", label: "Katalog produk", icon: Package2 },
    { id: "ads", label: "Iklan performa", icon: Smartphone },
];

const visualStyles = ["Minimal clean", "Professional tech", "Premium soft", "Bold marketplace"];
const productTypes = ["Makanan & Minuman", "Fashion", "Beauty", "Elektronik", "Rumah Tangga", "Lainnya"];
const copyTones = ["Friendly", "Persuasif", "Premium", "Urgent", "Edukatif"];
const channels = [
    { id: "instagram", label: "Instagram", icon: Smartphone },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "ads", label: "Ads", icon: Megaphone },
];

const goalExamples: Record<string, string> = {
    promo: "Contoh: promo bundling akhir pekan dengan CTA jelas.",
    catalog: "Contoh: katalog 3-5 produk dengan layout rapi dan konsisten.",
    ads: "Contoh: kreatif iklan fokus benefit utama dalam 3 detik pertama.",
};

const styleExamples: Record<string, string> = {
    "Minimal clean": "Contoh: ruang putih lega, elemen sedikit, fokus produk.",
    "Professional tech": "Contoh: komposisi tegas, modern, dan informatif.",
    "Premium soft": "Contoh: tone elegan, warna lembut, nuansa eksklusif.",
    "Bold marketplace": "Contoh: warna kontras, harga menonjol, impact tinggi.",
};

const channelExamples: Record<string, string> = {
    instagram: "Contoh: visual square dengan headline singkat yang mudah di-scan.",
    marketplace: "Contoh: fokus manfaat, detail produk, dan kejelasan harga.",
    ads: "Contoh: komposisi vertikal dengan hook kuat dan CTA cepat.",
};

const productTypeExamples: Record<string, string> = {
    "Makanan & Minuman": "Contoh: tonjolkan tekstur, rasa, dan porsi.",
    Fashion: "Contoh: fokus style, material, dan look pemakaian.",
    Beauty: "Contoh: tonjolkan hasil pemakaian dan kesan clean.",
    Elektronik: "Contoh: tampilkan fitur inti dengan visual tegas.",
    "Rumah Tangga": "Contoh: fokus fungsi praktis dan before/after.",
    Lainnya: "Contoh: tonjolkan benefit utama yang paling dicari.",
};

const copyToneExamples: Record<string, string> = {
    Friendly: "Contoh: bahasa hangat, santai, dan mudah dipahami.",
    Persuasif: "Contoh: menekankan manfaat plus alasan untuk aksi sekarang.",
    Premium: "Contoh: bahasa elegan, percaya diri, dan refined.",
    Urgent: "Contoh: menekankan batas waktu, stok, atau momentum.",
    Edukatif: "Contoh: jelaskan value produk dengan poin informatif.",
};

const catalogTypes = [
    { id: "product", label: "Product catalog" },
    { id: "service", label: "Service catalog" },
] as const;

const catalogPageOptions = [3, 5, 10] as const;

function mapCopyToneToCatalogTone(copyTone: string): "formal" | "fun" | "premium" | "soft_selling" {
    if (copyTone === "Premium") return "premium";
    if (copyTone === "Friendly") return "fun";
    if (copyTone === "Edukatif") return "formal";
    return "soft_selling";
}

export default function DesignInterviewPage() {
    const { status } = useSession();
    const router = useRouter();
    const posthog = usePostHog();
    const {
        uploadImage,
        planCatalogStructure,
        suggestCatalogStyles,
        mapCatalogImages,
        generateCatalogCopy,
        finalizeCatalogPlan,
    } = useProjectApi();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [goal, setGoal] = useState("");
    const [productType, setProductType] = useState("");
    const [customProductType, setCustomProductType] = useState("");
    const [style, setStyle] = useState("");
    const [channel, setChannel] = useState("");
    const [copyTone, setCopyTone] = useState("");
    const [productFile, setProductFile] = useState<File | null>(null);
    const [productPreview, setProductPreview] = useState<string | null>(null);
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [catalogType, setCatalogType] = useState<"product" | "service">("product");
    const [catalogTotalPages, setCatalogTotalPages] = useState(5);
    const [isCatalogPlanning, setIsCatalogPlanning] = useState(false);
    const [catalogPlanningError, setCatalogPlanningError] = useState<string | null>(null);
    const normalizedCustomProductType = customProductType.trim();
    const isOtherProductType = productType === "Lainnya";

    const progress = useMemo(() => {
        let filled = 0;
        const isProductTypeFilled = !!productType && (!isOtherProductType || normalizedCustomProductType.length > 0);
        if (goal) filled += 1;
        if (isProductTypeFilled) filled += 1;
        if (style) filled += 1;
        if (channel) filled += 1;
        if (copyTone) filled += 1;
        return Math.round((filled / 5) * 100);
    }, [channel, copyTone, goal, isOtherProductType, normalizedCustomProductType.length, productType, style]);

    useEffect(() => {
        return () => {
            if (productPreview && productPreview.startsWith("blob:")) {
                URL.revokeObjectURL(productPreview);
            }
        };
    }, [productPreview]);

    const handleRemoveProductFile = () => {
        if (productPreview && productPreview.startsWith("blob:")) {
            URL.revokeObjectURL(productPreview);
        }
        setProductFile(null);
        setProductPreview(null);
        setProductImageUrl(null);
        setUploadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleProductFileSelect = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setUploadError("File harus berupa gambar (JPG, PNG, WebP, dll).");
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
            setUploadError("Ukuran file maksimal 10 MB.");
            return;
        }

        setUploadError(null);
        setProductFile(file);

        if (productPreview && productPreview.startsWith("blob:")) {
            URL.revokeObjectURL(productPreview);
        }
        setProductPreview(URL.createObjectURL(file));

        setIsUploading(true);
        try {
            const uploaded = await uploadImage(file);
            setProductImageUrl(uploaded.url);
            posthog?.capture("design_brief_product_image_uploaded", {
                fileSize: file.size,
                mimeType: file.type,
            });
        } catch (error) {
            console.error(error);
            setProductImageUrl(null);
            setUploadError("Upload foto gagal. Coba lagi.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleContinue = async (isSkip = false) => {
        const finalGoal = (isSkip && !goal) ? "promo" : goal;
        const selectedProductType = (isSkip && !productType) ? "Makanan & Minuman" : productType;
        const finalCustomProductType = selectedProductType === "Lainnya" ? normalizedCustomProductType : "";
        const finalProductType = finalCustomProductType || selectedProductType;
        const finalStyle = (isSkip && !style) ? "Minimal clean" : style;
        const finalChannel = (isSkip && !channel) ? "instagram" : channel;
        const finalCopyTone = (isSkip && !copyTone) ? "Friendly" : copyTone;
        const finalCatalogType = catalogType;
        const finalCatalogTotalPages = Number.isFinite(catalogTotalPages) ? Math.min(Math.max(catalogTotalPages, 3), 24) : 5;
        const catalogGoal: CatalogGoal = finalCatalogType === "service" ? "showcasing" : "selling";

        let catalogSuggestedStructure;
        let catalogStyleOptions;
        let catalogSelectedStyle;
        let catalogImageMapping;
        let catalogGeneratedPages;
        let catalogFinalPlan;

        setCatalogPlanningError(null);

        if (finalGoal === "catalog") {
            setIsCatalogPlanning(true);
            try {
                const basics = {
                    catalog_type: finalCatalogType,
                    total_pages: finalCatalogTotalPages,
                    goal: catalogGoal,
                    tone: mapCopyToneToCatalogTone(finalCopyTone),
                    target_audience: finalChannel === "marketplace" ? "pembeli aktif marketplace" : undefined,
                    language: "id",
                    business_context: notes.trim() || undefined,
                };
                const planned = await planCatalogStructure(basics);
                const suggested = await suggestCatalogStyles({
                    basics,
                    structure: planned.suggested_structure,
                });
                catalogSuggestedStructure = planned.suggested_structure;
                catalogStyleOptions = suggested.style_options;
                catalogSelectedStyle = suggested.style_options[0]?.style;

                if (productImageUrl) {
                    const mappedImages = await mapCatalogImages({
                        basics,
                        structure: planned.suggested_structure,
                        images: [
                            {
                                image_id: "uploaded_product_image",
                                filename: productFile?.name,
                                description: `${finalProductType} ${notes.trim()}`.trim() || undefined,
                            },
                        ],
                    });
                    catalogImageMapping = mappedImages.image_mapping;
                }

                const generatedCopy = await generateCatalogCopy({
                    basics,
                    selected_style: catalogSelectedStyle || finalStyle,
                    pages: planned.suggested_structure,
                    business_data: {
                        business_name: finalProductType,
                        target_audience: finalChannel === "marketplace" ? "pembeli aktif marketplace" : "audiens visual digital",
                        category: finalProductType,
                        notes: notes.trim() || undefined,
                    },
                });
                catalogGeneratedPages = generatedCopy.pages;

                catalogFinalPlan = await finalizeCatalogPlan({
                    basics,
                    selected_style: catalogSelectedStyle || finalStyle,
                    structure: planned.suggested_structure,
                    image_mapping: catalogImageMapping || [],
                    page_copy: generatedCopy.pages,
                });
            } catch (error) {
                console.error(error);
                setCatalogPlanningError("Gagal menyiapkan struktur katalog awal. Coba lagi.");
                setIsCatalogPlanning(false);
                return;
            } finally {
                setIsCatalogPlanning(false);
            }
        }

        posthog?.capture("design_brief_interview_continue", {
            goal: finalGoal,
            productType: finalProductType,
            selectedProductType,
            customProductType: finalCustomProductType || undefined,
            style: finalStyle,
            channel: finalChannel,
            copyTone: finalCopyTone,
            hasNotes: notes.trim().length > 0,
            hasProductImage: !!productImageUrl,
            catalogType: finalGoal === "catalog" ? finalCatalogType : undefined,
            catalogTotalPages: finalGoal === "catalog" ? finalCatalogTotalPages : undefined,
            isSkip,
        });
        window.sessionStorage.setItem(
            DESIGN_BRIEF_SESSION_KEY,
            JSON.stringify({
                goal: finalGoal,
                productType: finalProductType,
                customProductType: finalCustomProductType || undefined,
                style: finalStyle,
                channel: finalChannel,
                copyTone: finalCopyTone,
                notes: notes.trim(),
                productImageUrl: productImageUrl ?? undefined,
                productImageFilename: productFile?.name,
                catalogType: finalGoal === "catalog" ? finalCatalogType : undefined,
                catalogTotalPages: finalGoal === "catalog" ? finalCatalogTotalPages : undefined,
                catalogSuggestedStructure,
                catalogStyleOptions,
                catalogSelectedStyle,
                catalogImageMapping,
                catalogGeneratedPages,
                catalogFinalPlan,
                updatedAt: new Date().toISOString(),
            })
        );
        router.push("/design/new/preview");
    };

    useEffect(() => {
        if (status !== "authenticated") return;
        posthog?.capture("design_brief_interview_viewed");
    }, [posthog, status]);

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
                <section className="sticky top-14 z-20 rounded-2xl border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Jalur desain baru</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Mulai dari brief visual, bukan panel samping.</h1>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push("/start")} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Kembali
                        </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Progress brief</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">1. Apa tujuan desain ini?</CardTitle>
                        <CardDescription>Pilih satu tujuan utama.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        {goals.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setGoal(item.id);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "goal",
                                        value: item.id,
                                    });
                                }}
                                className={`rounded-2xl border p-4 text-left transition-colors ${goal === item.id ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background shadow-sm">
                                    <item.icon className="h-5 w-5 text-primary" />
                                </div>
                                <p className="mt-4 text-sm font-semibold text-foreground">{item.label}</p>
                            </button>
                        ))}
                        {goal && (
                            <p className="md:col-span-3 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                {goalExamples[goal]}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">2. Jenis produk</CardTitle>
                        <CardDescription>Pilih kategori utama produk.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {productTypes.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setProductType(item);
                                    if (item !== "Lainnya") {
                                        setCustomProductType("");
                                    }
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "product_type",
                                        value: item,
                                    });
                                }}
                                className={`rounded-full border px-4 py-2 text-sm transition-colors ${productType === item ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                {item}
                            </button>
                        ))}
                        {productType && (
                            <p className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                {productTypeExamples[productType]}
                            </p>
                        )}
                        {isOtherProductType && (
                            <div className="w-full space-y-2">
                                <Input
                                    value={customProductType}
                                    onChange={(event) => setCustomProductType(event.target.value)}
                                    placeholder="Contoh: Foto Studio, Maternity Photoshoot..."
                                    aria-label="Kategori produk lainnya"
                                />
                                <p className="text-xs text-muted-foreground">Isi kategori spesifik agar prompt dan hasil desain lebih relevan.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {goal === "catalog" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">2A. Pengaturan katalog</CardTitle>
                            <CardDescription>Tentukan tipe katalog dan jumlah halaman. Struktur awal akan disiapkan otomatis.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">Catalog type</p>
                                <div className="flex flex-wrap gap-2">
                                    {catalogTypes.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setCatalogType(item.id)}
                                            className={`rounded-full border px-4 py-2 text-sm transition-colors ${catalogType === item.id ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">Jumlah halaman</p>
                                <div className="flex flex-wrap gap-2">
                                    {catalogPageOptions.map((pageCount) => (
                                        <button
                                            key={pageCount}
                                            type="button"
                                            onClick={() => setCatalogTotalPages(pageCount)}
                                            className={`rounded-full border px-4 py-2 text-sm transition-colors ${catalogTotalPages === pageCount ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                                        >
                                            {pageCount} halaman
                                        </button>
                                    ))}
                                </div>
                                <Input
                                    type="number"
                                    min={3}
                                    max={24}
                                    value={catalogTotalPages}
                                    onChange={(event) => setCatalogTotalPages(Number(event.target.value) || 5)}
                                    aria-label="Jumlah halaman katalog"
                                />
                                <p className="text-xs text-muted-foreground">Di preview, sistem akan menyiapkan structure awal dan 3 arah style yang bisa Anda evaluasi.</p>
                            </div>

                            {catalogPlanningError && (
                                <p className="text-xs text-destructive">{catalogPlanningError}</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">3. Gaya visual yang diinginkan</CardTitle>
                        <CardDescription>Pilih arah visual utama.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        {visualStyles.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setStyle(item);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "style",
                                        value: item,
                                    });
                                }}
                                className={`rounded-2xl border p-4 text-left transition-colors ${style === item ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background shadow-sm">
                                        <Palette className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{item}</p>
                                        <p className="text-xs text-muted-foreground">Dipakai sebagai arah awal untuk prompt dan preview.</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {style && (
                            <p className="sm:col-span-2 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                {styleExamples[style]}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">4. Channel utama</CardTitle>
                        <CardDescription>Pilih tempat desain paling sering dipakai.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        {channels.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setChannel(item.id);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "channel",
                                        value: item.id,
                                    });
                                }}
                                className={`rounded-2xl border p-4 text-left transition-colors ${channel === item.id ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                <item.icon className="h-5 w-5 text-primary" />
                                <p className="mt-4 text-sm font-semibold text-foreground">{item.label}</p>
                            </button>
                        ))}
                        {channel && (
                            <p className="md:col-span-3 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                {channelExamples[channel]}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">5. Tone copy</CardTitle>
                        <CardDescription>Pilih nada komunikasi utama.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {copyTones.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    setCopyTone(item);
                                    posthog?.capture("design_brief_interview_selection_changed", {
                                        field: "copy_tone",
                                        value: item,
                                    });
                                }}
                                className={`rounded-full border px-4 py-2 text-sm transition-colors ${copyTone === item ? "border-primary bg-primary/10 text-primary" : "bg-muted/20 hover:bg-muted/50"}`}
                            >
                                {item}
                            </button>
                        ))}
                        {copyTone && (
                            <p className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                {copyToneExamples[copyTone]}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">6. Foto produk (opsional)</CardTitle>
                        <CardDescription>Upload foto asli produk agar hasil katalog lebih akurat. Anda bisa lanjut tanpa upload.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    void handleProductFileSelect(file);
                                }
                            }}
                        />

                        <button
                            type="button"
                            className="w-full rounded-2xl border border-dashed bg-muted/20 p-5 text-left transition hover:bg-muted/40"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm">
                                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <ImagePlus className="h-5 w-5 text-primary" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{isUploading ? "Mengunggah foto..." : "Pilih atau ganti foto produk"}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP. Maksimal 10 MB.</p>
                                </div>
                            </div>
                        </button>

                        {productPreview && (
                            <div className="relative w-full overflow-hidden rounded-2xl border bg-muted/20 p-2">
                                <div className="relative h-52 w-full">
                                    <Image
                                        src={productPreview}
                                        alt="Preview foto produk"
                                        fill
                                        className="rounded-xl object-cover"
                                        unoptimized
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveProductFile}
                                    className="absolute right-4 top-4 rounded-full border bg-background p-1 text-muted-foreground hover:text-foreground"
                                    aria-label="Hapus foto produk"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {productFile && !isUploading && !uploadError && productImageUrl && (
                            <p className="text-xs text-emerald-600">Foto produk siap dipakai untuk langkah preview.</p>
                        )}

                        {uploadError && (
                            <p className="text-xs text-destructive">{uploadError}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">7. Catatan tambahan (opsional)</CardTitle>
                        <CardDescription>Tuliskan info penting seperti promo, harga, atau larangan visual tertentu.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Contoh: Fokus pada promo bundling, hindari warna merah, tampilkan kesan premium tapi tetap ramah."
                            rows={4}
                        />
                    </CardContent>
                </Card>

                <div className="sticky bottom-4 z-20 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Lanjutkan ke preview bertahap baru. Halaman berikutnya akan merangkum brief ini sebelum masuk ke engine desain existing sebagai fallback transisi.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => handleContinue(true)} className="rounded-xl">
                                Skip
                            </Button>
                            <Button onClick={() => void handleContinue(false)} size="lg" className="gap-2 rounded-xl" disabled={progress < 100 || isCatalogPlanning}>
                                {isCatalogPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {isCatalogPlanning ? "Menyiapkan katalog..." : "Lanjut ke Preview"}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
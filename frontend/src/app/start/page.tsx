"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { ArrowRight, GitCompare, Layers, Loader2, ShoppingBag, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectApi } from "@/lib/api";
import { COMPARE_MODELS_ENABLED, SELLER_FIRST_V1, START_HUB_ENABLED } from "@/lib/feature-flags";
import { featuredToolItems } from "@/lib/tool-catalog";

interface ProjectSummary {
    id: string;
    title: string;
    updated_at: string;
}

export default function StartPage() {
    const { status } = useSession();
    const posthog = usePostHog();
    const { getProjects } = useProjectApi();
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [projectsError, setProjectsError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadProjects = async () => {
            if (status !== "authenticated") return;
            try {
                const result = await getProjects();
                if (mounted) {
                    setProjects(result.slice(0, 3));
                    setProjectsError(null);
                }
            } catch (error) {
                console.error("Failed to load recent projects", error);
                if (mounted) {
                    setProjectsError("Gagal memuat proyek terbaru. Silakan muat ulang halaman.");
                }
            } finally {
                if (mounted) {
                    setLoadingProjects(false);
                }
            }
        };

        loadProjects();
        return () => {
            mounted = false;
        };
    }, [getProjects, status]);

    useEffect(() => {
        if (status !== "authenticated") return;
        posthog?.capture("start_hub_viewed");
    }, [posthog, status]);

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    if (!START_HUB_ENABLED) {
        redirect("/create?legacy=1");
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
                <section className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 px-6 py-8 md:px-10 md:py-12">
                    <div className="max-w-3xl space-y-4">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">Apa yang ingin kamu buat hari ini?</h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                            Pilih layanan yang kamu butuhkan untuk membuat visual produk yang menarik.
                        </p>
                    </div>
                </section>

                {SELLER_FIRST_V1 && (
                <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/30 px-6 py-6 md:px-8 md:py-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold text-foreground">Buat Desain untuk Marketplace &amp; Sosial</h2>
                                <p className="text-sm text-muted-foreground max-w-lg">
                                    Pilih platform (Shopee, Tokopedia, Instagram, WhatsApp) dan jenis promosi — ukuran + brief otomatis disiapkan.
                                </p>
                            </div>
                        </div>
                        <Button asChild size="lg" className="rounded-xl shrink-0 justify-between gap-2 w-full md:w-auto">
                            <Link
                                href="/design/new/seller"
                                onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "seller_first" })}
                            >
                                Mulai dari Platform
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </section>
                )}

                <section className="grid gap-4 lg:grid-cols-2">
                    <Card className="group relative overflow-hidden border-primary/20 bg-card shadow-sm hover:border-primary/50 transition-all duration-500 hover:shadow-md flex flex-col">
                        <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0">
                            <Image 
                                src="/images/promo-hero.png" 
                                alt="Buat Desain Promosi" 
                                fill 
                                className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                        </div>
                        <CardHeader className="relative -mt-16 gap-3 z-10 pb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary backdrop-blur-md border border-primary/20 shadow-sm">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">Buat Desain Promosi</CardTitle>
                                <CardDescription className="max-w-lg text-sm leading-6">
                                    Buat materi promosi dan banner media sosial secara otomatis dengan bantuan AI, cukup ceritakan kebutuhan kamu.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end">
                            <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground w-full mb-6">
                                <p>Sistem AI akan membantu kamu menentukan konsep, gaya visual, hingga ukuran yang pas untuk marketplace atau media sosial.</p>
                            </div>
                            <Button asChild size="lg" className="w-full justify-between rounded-xl">
                                <Link
                                    href="/design/new/interview"
                                    onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "design_brief" })}
                                >
                                    Mulai Jalur Desain
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-border bg-card shadow-sm hover:border-emerald-500/50 transition-all duration-500 hover:shadow-md flex flex-col">
                        <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0">
                            <Image 
                                src="/images/photo-hero.png" 
                                alt="Edit Foto Produk" 
                                fill 
                                className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                        </div>
                        <CardHeader className="relative -mt-16 gap-3 z-10 pb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 backdrop-blur-md border border-emerald-500/20 shadow-sm">
                                <Wand2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">Edit Foto Produk</CardTitle>
                                <CardDescription className="max-w-lg text-sm leading-6">
                                    Perbaiki kualitas foto, hapus background, atau hilangkan objek mengganggu dalam hitungan detik.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end">
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground mb-6">
                                {featuredToolItems.map((tool) => (
                                    <span key={tool.href} className="rounded-full bg-muted/50 border px-3 py-1.5">{tool.title}</span>
                                ))}
                            </div>
                            <Button asChild size="lg" variant="outline" className="w-full justify-between rounded-xl">
                                <Link
                                    href="/tools"
                                    onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "photo_tools" })}
                                >
                                    Buka AI Photo Tools
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Lanjutkan pekerjaan terakhir</CardTitle>
                            <CardDescription>Lanjutkan desain terakhir kamu.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingProjects ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Memuat proyek terbaru...
                                </div>
                            ) : projectsError ? (
                                <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
                                    {projectsError}
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                                    Belum ada proyek yang tersimpan. Mulai dari jalur desain baru atau edit foto produk.
                                </div>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-3">
                                    {projects.map((project) => (
                                        <Link
                                            key={project.id}
                                            href={`/edit/${project.id}`}
                                            onClick={() => posthog?.capture("start_hub_recent_project_opened", { project_id: project.id })}
                                            className="rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                                        >
                                            <p className="line-clamp-2 min-h-[3rem] text-sm font-semibold text-foreground">{project.title || "Tanpa Judul"}</p>
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                Diperbarui {new Date(project.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><Layers className="h-5 w-5 text-primary" /> Tools Cepat</CardTitle>
                            <CardDescription>Akses cepat ke alat edit foto yang sering digunakan.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {COMPARE_MODELS_ENABLED && (
                                <Link
                                    href="/compare-models"
                                    onClick={() => posthog?.capture("start_hub_quick_tool_opened", { tool_href: "/compare-models", tool_title: "Bandingkan Model" })}
                                    className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/60"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm">
                                        <GitCompare className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">Bandingkan Model</p>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">Bandingkan output Basic, Pro, dan Ultra dari satu brief.</p>
                                    </div>
                                </Link>
                            )}
                            {featuredToolItems.map((tool) => (
                                <Link
                                    key={tool.href}
                                    href={tool.href}
                                    onClick={() => posthog?.capture("start_hub_quick_tool_opened", { tool_href: tool.href, tool_title: tool.title })}
                                    className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/60"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm">
                                        <tool.Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">{tool.description}</p>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
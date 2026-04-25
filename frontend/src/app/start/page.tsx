"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { ArrowRight, Layers, Loader2, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectApi } from "@/lib/api";
import { START_HUB_ENABLED } from "@/lib/feature-flags";
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

    useEffect(() => {
        let mounted = true;

        const loadProjects = async () => {
            if (status !== "authenticated") return;
            try {
                const result = await getProjects();
                if (mounted) {
                    setProjects(result.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to load recent projects", error);
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
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Intent-first workspace</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">Apa yang ingin Anda lakukan hari ini?</h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                            Pilih jalur kerja yang paling sesuai. Flow desain baru dimulai dari brief visual, sedangkan flow edit foto langsung membawa Anda ke tools yang paling relevan.
                        </p>
                    </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                    <Card className="overflow-hidden border-primary/20 bg-card shadow-sm">
                        <CardHeader className="gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">Mulai Desain Baru</CardTitle>
                                <CardDescription className="max-w-lg text-sm leading-6">
                                    Masuk ke flow desain bertahap: pilih tujuan, gaya visual, dan channel promosi sebelum lanjut ke preview dan editor.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                                <span className="rounded-full bg-muted px-3 py-1">Brief visual</span>
                                <span className="rounded-full bg-muted px-3 py-1">Pilihan bergambar</span>
                                <span className="rounded-full bg-muted px-3 py-1">Flow tanpa sidebar statis</span>
                            </div>
                            <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground md:grid-cols-3">
                                <div>
                                    <p className="font-semibold text-foreground">1. Interview</p>
                                    <p className="mt-1">Pilih objective, style, dan channel.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">2. Preview</p>
                                    <p className="mt-1">Review arah visual sebelum generate lanjut.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">3. Canvas</p>
                                    <p className="mt-1">Masuk editor dengan konteks yang lebih rapi.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                            <Button asChild size="lg" className="w-full justify-between rounded-xl md:w-auto">
                                <Link
                                    href="/design/new/interview"
                                    onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "design_brief" })}
                                >
                                    Mulai Jalur Desain
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="overflow-hidden border-border bg-card shadow-sm">
                        <CardHeader className="gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Wand2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">Edit Foto Produk</CardTitle>
                                <CardDescription className="max-w-lg text-sm leading-6">
                                    Masuk ke galeri AI Photo Tools untuk merapikan satu foto, memproses batch, atau menyiapkan hasil yang siap diteruskan ke canvas desain.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border bg-muted/30 p-4">
                                    <p className="text-sm font-semibold text-foreground">1 Foto</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Before/after slider, hasil cepat, dan lanjut ke canvas.</p>
                                </div>
                                <div className="rounded-2xl border bg-muted/30 p-4">
                                    <p className="text-sm font-semibold text-foreground">Batch</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Galeri hasil per item, status progres, dan detail compare.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                                {featuredToolItems.map((tool) => (
                                    <span key={tool.href} className="rounded-full bg-muted px-3 py-1">{tool.title}</span>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                            <Button asChild size="lg" variant="outline" className="w-full justify-between rounded-xl md:w-auto">
                                <Link
                                    href="/tools"
                                    onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "photo_tools" })}
                                >
                                    Buka AI Photo Tools
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Lanjutkan pekerjaan terakhir</CardTitle>
                            <CardDescription>Project terbaru tetap bisa dibuka dari sini tanpa kembali ke dashboard proyek.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingProjects ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Memuat proyek terbaru...
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
                            <CardTitle className="flex items-center gap-2 text-xl"><Layers className="h-5 w-5 text-primary" /> Quick tools</CardTitle>
                            <CardDescription>Shortcut ke tools yang paling sering dipakai untuk katalog dan foto produk.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
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
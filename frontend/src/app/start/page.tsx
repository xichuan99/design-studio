"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";
import { ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { START_HUB_ENABLED } from "@/lib/feature-flags";

export default function StartPage() {
    const { status } = useSession();
    const posthog = usePostHog();

    useEffect(() => {
        if (status !== "authenticated") return;
        posthog?.capture("start_hub_viewed");
    }, [posthog, status]);

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center bg-[#0e0e10]"><Loader2 className="h-8 w-8 animate-spin text-[#d095ff]" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    if (!START_HUB_ENABLED) {
        redirect("/create?legacy=1");
    }

    return (
        <div className="min-h-screen bg-[#0e0e10] text-[#f9f5f8] selection:bg-[#d095ff]/30">
            <AppHeader />
            
            <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 py-16 md:py-24">
                {/* Hero Section */}
                <div className="text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-[#f9f5f8] to-[#adaaad]">
                        Apa yang ingin Anda buat hari ini?
                    </h1>
                    <p className="max-w-xl mx-auto text-lg text-[#adaaad]">
                        Pilih langkah awal untuk memajukan bisnis UMKM Anda dengan desain premium berbasis AI.
                    </p>
                </div>

                {/* Intent Cards */}
                <div className="grid w-full gap-8 md:grid-cols-2">
                    {/* Promotion Design Card */}
                    <Link 
                        href="/design/new/interview"
                        onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "design_brief" })}
                        className="group relative flex flex-col overflow-hidden rounded-[2rem] glass-morphism transition-all duration-500 hover:scale-[1.02] hover:void-glow"
                    >
                        <div className="relative aspect-[16/10] w-full overflow-hidden">
                            <Image 
                                src="/images/promo-hero.png" 
                                alt="Buat Desain Promosi" 
                                fill 
                                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-transparent to-transparent opacity-60" />
                        </div>
                        
                        <div className="flex flex-1 flex-col p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d095ff]/10 text-[#d095ff]">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold">Buat Desain Promosi</h2>
                            </div>
                            <p className="text-[#adaaad] leading-relaxed">
                                Buat banner media sosial dan materi promosi otomatis hanya dengan menceritakan produk Anda.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-[#d095ff] font-medium group-hover:gap-4 transition-all">
                                Mulai Desain Baru <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>
                    </Link>

                    {/* Photo Edit Card */}
                    <Link 
                        href="/tools"
                        onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "photo_tools" })}
                        className="group relative flex flex-col overflow-hidden rounded-[2rem] glass-morphism transition-all duration-500 hover:scale-[1.02] hover:void-glow"
                    >
                        <div className="relative aspect-[16/10] w-full overflow-hidden">
                            <Image 
                                src="/images/photo-hero.png" 
                                alt="Edit Foto Produk" 
                                fill 
                                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-transparent to-transparent opacity-60" />
                        </div>
                        
                        <div className="flex flex-1 flex-col p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e3fd]/10 text-[#00e3fd]">
                                    <Wand2 className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold">Edit Foto Produk</h2>
                            </div>
                            <p className="text-[#adaaad] leading-relaxed">
                                Percantik foto produk Anda: hapus background, perbaiki kualitas, atau ubah suasana foto secara instan.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-[#00e3fd] font-medium group-hover:gap-4 transition-all">
                                Buka AI Photo Tools <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
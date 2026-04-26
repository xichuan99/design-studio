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
        <div className="min-h-screen bg-[#0e0e10] text-[#f9f5f8] selection:bg-[#d095ff]/30 overflow-x-hidden">
            <AppHeader />
            
            <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-20 px-6 py-12 md:py-24">
                {/* Editorial Hero Section */}
                <section className="relative text-center space-y-8">
                    <div className="inline-block px-3 py-1 rounded-full border border-[#d095ff]/20 bg-[#d095ff]/5 text-[10px] font-bold uppercase tracking-[0.4em] text-[#d095ff] mb-2">
                        Studio Kreatif
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-[#f9f5f8] via-[#f9f5f8] to-[#adaaad] leading-[0.9]">
                        Apa yang ingin <br className="hidden md:block" /> Anda buat hari ini?
                    </h1>
                    <p className="max-w-2xl mx-auto text-[#adaaad] text-lg md:text-xl font-medium">
                        Wujudkan ide bisnis Anda dengan desain promosi <br className="hidden md:block" /> dan editing produk berbasis AI tingkat tinggi.
                    </p>
                </section>

                {/* Intent Hub - Two Dominant Options */}
                <section className="grid w-full gap-10 md:grid-cols-2">
                    {/* Promotion Design Card */}
                    <Link 
                        href="/design/new/interview"
                        onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "design_brief" })}
                        className="group relative flex flex-col h-[520px] overflow-hidden rounded-[3rem] bg-[#131315] transition-all duration-700 hover:scale-[1.01] hover:bg-[#19191c]"
                    >
                        <div className="absolute inset-0 z-0">
                            <Image 
                                src="/images/promo-hero.png" 
                                alt="Buat Desain Promosi" 
                                fill 
                                className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-30 group-hover:opacity-50"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-transparent to-transparent opacity-80" />
                        </div>
                        
                        <div className="relative z-10 flex h-full flex-col p-12 md:p-16">
                            <div className="mb-auto">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d095ff]/10 text-[#d095ff] transition-all duration-500 group-hover:bg-[#d095ff] group-hover:text-[#0e0e10] group-hover:rotate-6">
                                    <Sparkles className="h-7 w-7" />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">Buat Desain <br /> Promosi</h2>
                                <p className="text-[#adaaad] text-lg font-medium max-w-[320px] leading-relaxed">
                                    Banner media sosial otomatis hanya dengan menceritakan produk Anda.
                                </p>
                                <div className="pt-6 flex items-center gap-3 text-[#d095ff] font-black text-sm uppercase tracking-widest transition-all">
                                    Mulai Sekarang <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Glow effect */}
                        <div className="absolute -inset-px rounded-[3rem] border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    </Link>

                    {/* Photo Edit Card */}
                    <Link 
                        href="/tools"
                        onClick={() => posthog?.capture("start_hub_intent_selected", { intent: "photo_tools" })}
                        className="group relative flex flex-col h-[520px] overflow-hidden rounded-[3rem] bg-[#131315] transition-all duration-700 hover:scale-[1.01] hover:bg-[#19191c]"
                    >
                        <div className="absolute inset-0 z-0">
                            <Image 
                                src="/images/photo-hero.png" 
                                alt="Edit Foto Produk" 
                                fill 
                                className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-30 group-hover:opacity-50"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-transparent to-transparent opacity-80" />
                        </div>
                        
                        <div className="relative z-10 flex h-full flex-col p-12 md:p-16">
                            <div className="mb-auto">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00e3fd]/10 text-[#00e3fd] transition-all duration-500 group-hover:bg-[#00e3fd] group-hover:text-[#0e0e10] group-hover:rotate-6">
                                    <Wand2 className="h-7 w-7" />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">Edit Foto <br /> Produk</h2>
                                <p className="text-[#adaaad] text-lg font-medium max-w-[320px] leading-relaxed">
                                    Hapus background, perbaiki kualitas, atau ubah suasana foto secara instan.
                                </p>
                                <div className="pt-6 flex items-center gap-3 text-[#00e3fd] font-black text-sm uppercase tracking-widest transition-all">
                                    Buka Alat AI <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                                </div>
                            </div>
                        </div>

                        {/* Glow effect */}
                        <div className="absolute -inset-px rounded-[3rem] border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    </Link>
                </section>

                {/* Footer Insight (Subtle) */}
                <section className="text-center">
                    <p className="text-[#adaaad]/40 text-xs font-bold uppercase tracking-[0.5em]">
                        Powered by Advanced AI Atelier
                    </p>
                </section>
            </main>
        </div>
    );
}
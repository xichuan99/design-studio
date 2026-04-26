"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { Loader2, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { badgeClassName, toolSections } from "@/lib/tool-catalog";

export default function ToolsHubPage() {
  const { status } = useSession();
  const posthog = usePostHog();

  useEffect(() => {
    if (status !== "authenticated") return;
    posthog?.capture("tools_hub_viewed", { source: "authenticated_app" });
  }, [posthog, status]);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center bg-[#0e0e10]"><Loader2 className="h-8 w-8 animate-spin text-[#d095ff]" /></div>;
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#f9f5f8] selection:bg-[#d095ff]/30">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-6 py-12 md:py-24">
        {/* Editorial Hero Section */}
        <section className="relative text-center space-y-6">
          <div className="inline-block px-3 py-1 rounded-full border border-[#d095ff]/20 bg-[#d095ff]/5 text-[10px] font-bold uppercase tracking-[0.4em] text-[#d095ff] mb-4">
            AI Atelier
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-[#f9f5f8] to-[#adaaad]">
            Alat Edit Foto Produk
          </h1>
          <p className="max-w-xl mx-auto text-[#adaaad] text-lg md:text-xl font-medium">
            Transformasi katalog Anda dengan kecerdasan buatan. Cepat, presisi, dan memukau.
          </p>
        </section>

        {/* Premium Action Grid - Desktop Layout */}
        <section className="grid gap-8 md:grid-cols-3">
          <Link 
            href="/tools/background-swap" 
            className="group relative h-[320px] rounded-[2.5rem] bg-[#131315] overflow-hidden transition-all duration-700 hover:bg-[#19191c] border-0"
            onClick={() => posthog?.capture("tools_hub_tool_clicked", { tool_name: "Edit Satu Foto", tool_href: "/tools/background-swap", section: "featured" })}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#d095ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-[url('/images/photo-hero.png')] bg-cover bg-center opacity-20 group-hover:opacity-40 transition-opacity duration-700 scale-110 group-hover:scale-100" />
            <div className="relative h-full p-10 flex flex-col justify-end z-10">
              <h3 className="text-2xl font-semibold mb-2">Edit Satu Foto</h3>
              <p className="text-[#adaaad] text-sm leading-relaxed max-w-[240px]">Upload satu foto produk untuk hasil instan dan cepat.</p>
              <div className="mt-6 flex items-center gap-2 text-[#d095ff] font-bold text-sm">
                Mulai Sekarang <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
          
          <Link 
            href="/tools/batch-process" 
            className="group relative h-[320px] rounded-[2.5rem] bg-[#131315] overflow-hidden transition-all duration-700 hover:bg-[#19191c] border-0"
            onClick={() => posthog?.capture("tools_hub_tool_clicked", { tool_name: "Edit Banyak Foto (Katalog)", tool_href: "/tools/batch-process", section: "featured" })}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00e3fd]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-[url('/images/promo-hero.png')] bg-cover bg-center opacity-20 group-hover:opacity-40 transition-opacity duration-700 scale-110 group-hover:scale-100" />
            <div className="relative h-full p-10 flex flex-col justify-end z-10">
              <h3 className="text-2xl font-semibold mb-2">Edit Massal</h3>
              <p className="text-[#adaaad] text-sm leading-relaxed max-w-[240px]">Proses seluruh katalog produk Anda sekaligus dalam sekejap.</p>
              <div className="mt-6 flex items-center gap-2 text-[#00e3fd] font-bold text-sm">
                Buka Katalog <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link 
            href="/my-assets" 
            className="group relative h-[320px] rounded-[2.5rem] bg-[#131315] overflow-hidden transition-all duration-700 hover:bg-[#19191c] border-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative h-full p-10 flex flex-col justify-end z-10 border border-white/5 rounded-[2.5rem]">
              <h3 className="text-2xl font-semibold mb-2">Galeri Saya</h3>
              <p className="text-[#adaaad] text-sm leading-relaxed max-w-[240px]">Lihat dan ambil kembali hasil edit foto yang pernah Anda buat.</p>
              <div className="mt-6 flex items-center gap-2 text-[#f9f5f8] font-bold text-sm">
                Lihat Galeri <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </section>

        {/* Detailed Catalog Sections */}
        <section className="grid gap-20 xl:grid-cols-2 mt-8">
          {toolSections.map((section) => (
            <div key={section.title} className="space-y-10">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-2xl font-bold">{section.title}</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              <div className="grid gap-6">
                {section.items.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="group flex items-center gap-8 rounded-[2rem] bg-[#131315]/50 px-8 py-6 transition-all duration-500 hover:bg-[#19191c] hover:scale-[1.01]" 
                    onClick={() => posthog?.capture("tools_hub_tool_clicked", { tool_name: item.title, tool_href: item.href, section: section.title })}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#d095ff]/10 text-[#d095ff] transition-all duration-500 group-hover:bg-[#d095ff] group-hover:text-[#0e0e10] group-hover:rotate-6">
                      <item.Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        {item.badge ? <span className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold tracking-wider uppercase ${badgeClassName[item.badge]}`}>{item.badge}</span> : null}
                      </div>
                      <p className="text-[#adaaad] mt-1 line-clamp-1 font-medium">{item.description}</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-[#adaaad] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { Loader2, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-[#0e0e10] text-[#f9f5f8]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-12 md:py-20">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d095ff]">SmartDesign AI</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-[#f9f5f8] to-[#adaaad]">
            Alat Edit Foto Produk
          </h1>
          <p className="max-w-2xl mx-auto text-[#adaaad] text-lg">
            Hasil profesional dalam hitungan detik. Tanpa ribet, langsung siap jualan.
          </p>
        </section>

        {/* Quick Access Grid */}
        <section className="grid gap-6 md:grid-cols-3">
          <Link 
            href="/tools/background-swap" 
            className="group relative rounded-[2rem] glass-morphism p-8 transition-all duration-500 hover:scale-[1.02] hover:void-glow"
            onClick={() => posthog?.capture("tools_hub_tool_clicked", { tool_name: "Edit Satu Foto", tool_href: "/tools/background-swap", section: "featured" })}
          >
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              Edit Satu Foto <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h3>
            <p className="text-[#adaaad]">Upload satu foto produk untuk hasil instan dan cepat.</p>
          </Link>
          
          <Link 
            href="/tools/batch-process" 
            className="group relative rounded-[2rem] glass-morphism p-8 transition-all duration-500 hover:scale-[1.02] hover:void-glow"
            onClick={() => posthog?.capture("tools_hub_tool_clicked", { tool_name: "Edit Banyak Foto (Katalog)", tool_href: "/tools/batch-process", section: "featured" })}
          >
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              Edit Massal <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h3>
            <p className="text-[#adaaad]">Proses seluruh katalog produk Anda sekaligus dalam sekejap.</p>
          </Link>

          <Link 
            href="/my-assets" 
            className="group relative rounded-[2rem] glass-morphism p-8 transition-all duration-500 hover:scale-[1.02] hover:void-glow"
          >
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              Galeri Saya <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h3>
            <p className="text-[#adaaad]">Lihat dan ambil kembali hasil edit foto yang pernah Anda buat.</p>
          </Link>
        </section>

        {/* Detailed Tool Sections */}
        <section className="grid gap-12 xl:grid-cols-2">
          {toolSections.map((section) => (
            <div key={section.title} className="space-y-6">
              <h2 className="text-2xl font-bold px-2">{section.title}</h2>
              <div className="grid gap-4">
                {section.items.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="group flex items-center gap-6 rounded-[1.5rem] glass-morphism px-6 py-5 transition-all duration-300 hover:bg-white/[0.05]" 
                    onClick={() => posthog?.capture("tools_hub_tool_clicked", { tool_name: item.title, tool_href: item.href, section: section.title })}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d095ff]/10 text-[#d095ff] transition-transform group-hover:scale-110">
                      <item.Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold">{item.title}</p>
                        {item.badge ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter ${badgeClassName[item.badge]}`}>{item.badge}</span> : null}
                      </div>
                      <p className="text-sm text-[#adaaad] line-clamp-1">{item.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#adaaad] opacity-0 group-hover:opacity-100 transition-all" />
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

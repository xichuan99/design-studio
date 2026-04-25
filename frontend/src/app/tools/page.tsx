"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeClassName, toolSections } from "@/lib/tool-catalog";

export default function ToolsHubPage() {
  const { status } = useSession();

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <section className="rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 px-6 py-8 md:px-10 md:py-12">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">AI Photo Tools</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">Pilih alur edit foto yang paling cocok.</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Mulai dari satu foto untuk perbaikan cepat, atau langsung masuk ke batch processing untuk katalog yang lebih banyak. Hasil akhirnya akan diarahkan ke download atau lanjut ke canvas desain.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link href="/tools/background-swap" className="rounded-3xl border bg-card p-6 transition-colors hover:bg-muted/40">
            <p className="text-sm font-semibold text-foreground">Single image flow</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Upload satu foto, review before/after, lalu pilih download atau lanjut ke canvas.</p>
          </Link>
          <Link href="/tools/batch-process" className="rounded-3xl border bg-card p-6 transition-colors hover:bg-muted/40">
            <p className="text-sm font-semibold text-foreground">Batch processing</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Proses banyak file sekaligus, lihat progres per item, dan pilih hasil yang ingin diteruskan.</p>
          </Link>
          <Link href="/my-assets" className="rounded-3xl border bg-card p-6 transition-colors hover:bg-muted/40">
            <p className="text-sm font-semibold text-foreground">Asset repository</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Akses hasil yang sudah tersimpan dan bawa kembali ke editor kapan saja.</p>
          </Link>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {toolSections.map((section) => (
            <Card key={section.title} className="border-border/80">
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription>Pilih tool sesuai kebutuhan edit foto saat ini.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-start gap-4 rounded-2xl border bg-muted/20 px-4 py-4 transition-colors hover:bg-muted/50">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background shadow-sm">
                      <item.Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        {item.badge ? <span className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold leading-none ${badgeClassName[item.badge]}`}>{item.badge}</span> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

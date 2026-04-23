import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wand2, Eraser, MoveDiagonal, Sparkles, Camera, ShieldCheck, Layers, Images, Type } from "lucide-react";
import Link from "next/link";

export default function ToolsHubPage() {
  const tools = [
    {
      title: "AI Background Swap",
      description: "Ganti background foto produk Anda jadi studio profesional \u2014 cocok untuk Shopee & Tokopedia.",
      icon: <Wand2 className="w-8 h-8 text-blue-500" />,
      href: "/tools/background-swap",
      isReady: true,
    },
    {
      title: "Quick Retouch",
      description: "Foto kurang terang atau ada noda? Cerahkan dan bersihkan otomatis, hasilnya natural.",
      icon: <Sparkles className="w-8 h-8 text-yellow-500" />,
      href: "/tools/retouch",
      isReady: true,
    },
    {
      title: "AI Product Scene",
      description: "Ubah foto produk biasa jadi tampil di meja kafe, studio, atau taman \u2014 tanpa pemotretan ulang.",
      icon: <Sparkles className="w-8 h-8 text-amber-500" />,
      href: "/tools/product-scene",
      isReady: true,
    },
    {
      title: "Batch Photo Processor",
      description: "Punya 50 foto produk? Upload semuanya \u2014 background bersih dan watermark terpasang otomatis.",
      icon: <Layers className="w-8 h-8 text-indigo-500" />,
      href: "/tools/batch-process",
      isReady: true,
    },
    {
      title: "ID Photo Maker",
      description: "Buat pasfoto untuk keperluan resmi (KTP, ijazah, CV, visa) langsung dari foto selfie.",
      icon: <Camera className="w-8 h-8 text-blue-500" />,
      href: "/tools/id-photo",
      isReady: true,
    },
    {
      title: "Magic Eraser",
      description: "Ada tangan orang nyangkut di foto produk? Hapus bersih tanpa bekas \u2014 cukup usap saja.",
      icon: <Eraser className="w-8 h-8 text-pink-500" />,
      href: "/tools/magic-eraser",
      isReady: true,
    },
    {
      title: "Generative Expand",
      description: "Foto terlalu sempit untuk banner? Perluas sisi foto tanpa kehilangan objek utama.",
      icon: <MoveDiagonal className="w-8 h-8 text-indigo-500" />,
      href: "/tools/generative-expand",
      isReady: true,
    },
    {
      title: "AI Text Banner",
      description: "Buat elemen teks dekoratif dengan background transparan untuk promosi desain Anda.",
      icon: <Type className="w-8 h-8 text-purple-500" />,
      href: "/tools/text-banner",
      isReady: true,
    },
    {
      title: "AI Watermark Placer",
      description: "Tempelkan logo atau nama toko di semua foto produk secara otomatis \u2014 anti dicuri kompetitor.",
      icon: <ShieldCheck className="w-8 h-8 text-orange-500" />,
      href: "/tools/watermark-placer",
      isReady: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-8 w-full">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">AI Photo Tools</h1>
          <p className="text-muted-foreground mt-2 text-base sm:text-lg">
            Alat cepat untuk membersihkan, memperbaiki, dan menyiapkan aset sebelum lanjut ke editor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {tools.map((tool, idx) => (
            <Card key={idx} className={`border-2 transition-all ${tool.isReady ? "hover:border-primary/60 cursor-pointer hover:shadow-[0_0_20px_rgba(108,43,238,0.15)] hover:scale-[1.01] transition-all duration-200" : "opacity-40 grayscale bg-muted/20 pointer-events-none select-none"}`} title={!tool.isReady ? "Segera hadir!" : undefined}>
              {tool.isReady ? (
                <Link href={tool.href} className="flex flex-col h-full pointer-events-auto">
                  <CardHeader className="flex flex-row items-start gap-4 pb-4">
                    <div className="p-3 bg-muted rounded-xl">{tool.icon}</div>
                    <div>
                      <CardTitle className="text-xl">{tool.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed">{tool.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Link>
              ) : (
                <div className="flex flex-col h-full cursor-not-allowed">
                  <CardHeader className="flex flex-row items-start gap-4 pb-4">
                    <div className="p-3 bg-background rounded-xl border border-border/50 shadow-sm">{tool.icon}</div>
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {tool.title}
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Coming Soon</span>
                      </CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed">{tool.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent />
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* CTA to My Assets */}
          <div className="mt-10 mb-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Semua hasil AI Tools Anda tersimpan otomatis dan siap dibuka lagi dari editor.
            </p>
            <Link
              href="/my-assets"
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              <Images className="w-4 h-4" />
              Lihat Aset Saya →
            </Link>
          </div>
      </div>
    </div>
  );
}

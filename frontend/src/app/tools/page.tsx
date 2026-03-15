import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wand2, ImagePlus, Eraser, MoveDiagonal, Sparkles, Camera, ShieldCheck, Layers, Upload, Download, ShoppingBag, ImageOff, Copy, Banknote } from "lucide-react";
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
      title: "AI Image Upscaler",
      description: "Foto HP buram atau kecil? Perbesar dan pertajam otomatis supaya layak upload ke marketplace.",
      icon: <ImagePlus className="w-8 h-8 text-green-500" />,
      href: "/tools/upscaler",
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
            Sulap foto produk sederhana Anda menjadi aset visual profesional.
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

        {/* Cara Kerjanya Section */}
        <div className="mt-12 sm:mt-20 mb-8 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">Cara Kerjanya</h2>
            <p className="text-muted-foreground mt-2">Sangat mudah, tidak perlu jago desain.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector Lines (only visible on md+) */}
            <div className="hidden md:block absolute top-[2.5rem] left-[16%] right-[16%] h-[2px] bg-border opacity-50 z-0" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-4 border-background animate-pulse">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">1. Upload Foto</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Foto dari HP pun bisa! Langsung drag & drop ke alat yang Anda pilih.
              </p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border-4 border-background hover:scale-105 transition-transform cursor-default">
                <Wand2 className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">2. Pilih Tools AI</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pilih tool yang Anda butuhkan \u2014 misalnya hapus background. Hasilnya otomatis.
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border-4 border-background hover:scale-105 transition-transform cursor-default">
                <Download className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">3. Download & Pakai</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unduh hasil resolusi tinggi dan langsung pasang di toko online Anda.
              </p>
            </div>
          </div>
        </div>

        {/* UMKM Feature Highlights Section */}
        <div className="mt-16 sm:mt-24 mb-12">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">Kenapa UMKM Pilih Tools Kami?</h2>
            <p className="text-muted-foreground mt-2">Didesain khusus untuk mempercepat jualan Anda.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border bg-gradient-to-br from-background to-amber-500/5 hover:scale-[1.02] transition-transform duration-300">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Foto Produk Siap Jual</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upload foto biasa dari HP, langsung disulap jadi foto produk profesional ala studio untuk etalase Shopee & Tokopedia Anda.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-gradient-to-br from-background to-blue-500/5 hover:scale-[1.02] transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <ImageOff className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Background Bersih Otomatis</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Tidak perlu sewa desainer Photoshop. Berapapun ribetnya background asli, klik sekali langsung transparan atau berubah jadi background estetis.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-gradient-to-br from-background to-indigo-500/5 hover:scale-[1.02] transition-transform duration-300">
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Copy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Proses 50 Foto Sekaligus</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Mengerjakan upload produk baru? Upload puluhan foto sekaligus, hasilnya langsung jadi berbarengan dalam hitungan menit, bukan berjam-jam.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-gradient-to-br from-background to-emerald-500/5 hover:scale-[1.02] transition-transform duration-300">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Banknote className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Hemat Biaya Desainer</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Simpan margin keuntungan Anda. Tidak perlu lagi bayar jasa edit foto mingguan karena semua bisa Anda kerjakan sendiri, kapan saja.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

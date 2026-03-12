import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wand2, ImagePlus, Eraser, MoveDiagonal } from "lucide-react";
import Link from "next/link";

export default function ToolsHubPage() {
  const tools = [
    {
      title: "AI Background Swap",
      description: "Hapus background foto produk dan ganti dengan suasana profesional lengkap dengan bayangan.",
      icon: <Wand2 className="w-8 h-8 text-blue-500" />,
      href: "/tools/background-swap",
      isReady: true,
    },
    {
      title: "AI Image Upscaler",
      description: "Pertajam dan perbesar ukuran foto yang buram atau pecah (hingga 4x ukuran asli).",
      icon: <ImagePlus className="w-8 h-8 text-green-500" />,
      href: "/tools/upscaler",
      isReady: true,
    },
    {
      title: "Magic Eraser",
      description: "Hapus objek yang mengganggu atau noda dari foto Anda dengan sekali usap.",
      icon: <Eraser className="w-8 h-8 text-gray-400" />,
      href: "#",
      isReady: false,
    },
    {
      title: "Generative Expand",
      description: "Perluas area (outpaint) foto Anda menyesuaikan rasio tanpa memotong objek utama.",
      icon: <MoveDiagonal className="w-8 h-8 text-gray-400" />,
      href: "#",
      isReady: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Photo Tools</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Sulap foto produk sederhana Anda menjadi aset visual profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {tools.map((tool, idx) => (
            <Card key={idx} className={`border-2 transition-all ${tool.isReady ? "hover:border-primary/50 cursor-pointer hover:shadow-md" : "opacity-60 grayscale bg-muted/30"}`}>
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
      </div>
    </div>
  );
}

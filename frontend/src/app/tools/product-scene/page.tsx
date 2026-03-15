"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, PenSquare, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";

const THEMES = [
  { id: "studio", name: "Studio Profesional", emoji: "📸" },
  { id: "nature", name: "Alam & Outdoor", emoji: "🌿" },
  { id: "cafe", name: "Suasana Cafe", emoji: "☕" },
  { id: "minimalist", name: "Minimalis Modern", emoji: "⬜" },
  { id: "kitchen", name: "Dapur & Lifestyle", emoji: "🍳" },
  { id: "bathroom", name: "Kamar Mandi & Spa", emoji: "🛁" },
];

export default function ProductScenePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [theme, setTheme] = useState("studio");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");
  const api = useProjectApi();

  const handleFileSelect = (file: File) => {
    if (previewOriginal) URL.revokeObjectURL(previewOriginal);
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!originalFile || !theme) return;
    setLoading(true);

    try {
      const data = await api.productScene(originalFile, theme, aspectRatio);
      setResultUrl(data.url);
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 select-none">
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 1 ? 'bg-primary text-primary-foreground shadow-md' : step > 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">1</span>
            <span className="hidden sm:inline">Upload Produk</span>
          </div>
          <div className={`w-4 sm:w-8 h-[2px] ${step > 1 ? 'bg-primary/40' : 'bg-border'}`}></div>
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 2 ? 'bg-primary text-primary-foreground shadow-md' : step > 2 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">2</span>
            <span className="hidden sm:inline">Pilih Tema</span>
          </div>
          <div className={`w-4 sm:w-8 h-[2px] ${step > 2 ? 'bg-primary/40' : 'bg-border'}`}></div>
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 3 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">3</span>
            <span className="hidden sm:inline">Hasil</span>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Product Scene</h1>
          <p className="text-muted-foreground mt-2">Buat foto produk profesional hanya dengan satu klik menggunakan AI.</p>
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Foto Produk</h3>
              <div className="aspect-[4/3] bg-muted/50 rounded-xl overflow-hidden border border-border shadow-inner relative">
                <Image src={previewOriginal} alt="Original" fill className="object-contain p-2" unoptimized />
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">2. Pengaturan Tampilan</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium block">Pilih Tema Background</label>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`text-left flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        theme === t.id 
                          ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      <span className="text-3xl mb-2">{t.emoji}</span>
                      <span className="text-sm font-semibold">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium block">Aspek Rasio (Ukuran Foto)</label>
                <div className="bg-muted/50 p-1.5 rounded-lg flex gap-1 border">
                  {["1:1", "9:16", "16:9"].map(ratio => (
                    <Button 
                      key={ratio} 
                      variant={aspectRatio === ratio ? "default" : "ghost"}
                      className={`flex-1 ${aspectRatio !== ratio ? "text-muted-foreground" : ""}`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      {ratio} {/* 1:1=Square, 9:16=Story, 16:9=Landscape */}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95 py-6 text-base" 
                size="lg" 
                disabled={loading}
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses dengan AI (30s)...</> : <><Sparkles className="w-5 h-5 mr-2" /> Buat Foto Produk</>}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Hasil Jadi</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" />

            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="outline" onClick={() => setStep(2)}>
                <span className="mr-2">♻️</span> Ganti Tema
              </Button>
              <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-5 h-5" /> Download HD
              </Button>
              <Button size="lg" variant="secondary" className="gap-2" onClick={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}>
                <PenSquare className="w-5 h-5" /> Lanjut ke Editor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

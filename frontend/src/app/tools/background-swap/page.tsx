"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Download, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function BackgroundSwapPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [style, setStyle] = useState("bold");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!originalFile || !prompt) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", originalFile);
      formData.append("prompt", prompt);
      formData.append("aspect_ratio", aspectRatio);
      formData.append("style", style);

      const res = await fetch("/api/tools/background-swap", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Gagal memproses gambar");
      }

      const data = await res.json();
      setResultUrl(data.url);
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Background Swap</h1>
          <p className="text-muted-foreground mt-2">Hapus latar belakang foto produk Anda dan ganti dengan suasana profesional.</p>
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Gambar Original</h3>
              <div className="aspect-[4/3] bg-muted/50 rounded-xl overflow-hidden border border-border shadow-inner relative">
                <Image src={previewOriginal} alt="Original" fill className="object-contain p-2" unoptimized />
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">2. Tentukan Suasana Baru</h3>
              <div className="space-y-3">
                <label className="text-sm font-medium">Deskripsikan latar belakang (Prompt)</label>
                <Input 
                  placeholder="Contoh: di atas meja kayu dengan pencahayaan studio..." 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  className="bg-card shadow-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Aspek Rasio</label>
                <div className="bg-muted/50 p-1.5 rounded-lg flex gap-1 border">
                  {["1:1", "9:16", "16:9"].map(ratio => (
                    <Button 
                      key={ratio} 
                      variant={aspectRatio === ratio ? "default" : "ghost"}
                      className={`flex-1 ${aspectRatio !== ratio ? "text-muted-foreground" : ""}`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      {ratio}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Style & Lighting</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input shadow-sm bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="bold">Bold & Vibrant</option>
                  <option value="minimalist">Minimalist Studio</option>
                  <option value="elegant">Elegant Premium</option>
                  <option value="playful">Playful / Pop</option>
                </select>
              </div>

              <Button 
                onClick={handleGenerate} 
                className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95" 
                size="lg" 
                disabled={!prompt || loading}
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Memproses GPU (30s)...</> : "Generate AI Background"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Hasil Akhir</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" />

            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="outline" onClick={() => setStep(2)}>
                <span className="mr-2">♻️</span> Generate Ulang
              </Button>
              <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-5 h-5" /> Download HD
              </Button>
              <Button size="lg" variant="secondary" className="gap-2" onClick={() => alert("Integrasi editor ke proyek spesifik akan hadir di fase berikutnya!")}>
                <PenSquare className="w-5 h-5" /> Lanjut ke Editor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UpscalerPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [scale, setScale] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!originalFile) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", originalFile);
      formData.append("scale", scale.toString());

      const res = await fetch("/api/tools/upscale", {
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
    } catch (err: any) {
      alert(err.message);
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
          <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Image Upscaler</h1>
          <p className="text-muted-foreground mt-2">Menjernihkan, mempertajam, dan memperbesar gambar yang buram atau low-res (Up to 4x).</p>
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Gambar Original</h3>
              <div className="aspect-[4/3] bg-muted/50 rounded-xl overflow-hidden border border-border shadow-inner">
                <img src={previewOriginal} alt="Original" className="w-full h-full object-contain p-2" />
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">2. Pilih Tingkat Upscale</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant={scale === 2 ? "default" : "outline"} 
                  className={`h-28 flex flex-col gap-2 border-2 ${scale === 2 ? "border-primary" : "border-border hover:border-primary/50"} transition-all`}
                  onClick={() => setScale(2)}
                >
                  <span className="text-3xl font-black">2x</span>
                  <span className="text-xs font-medium opacity-80">Keseimbangan Cepat & HD</span>
                </Button>
                <Button 
                  variant={scale === 4 ? "default" : "outline"} 
                  className={`h-28 flex flex-col gap-2 relative overflow-hidden border-2 ${scale === 4 ? "border-primary" : "border-border hover:border-primary/50"} transition-all`}
                  onClick={() => setScale(4)}
                >
                  <div className={`absolute top-0 right-0 ${scale === 4 ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"} text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg transition-colors`}>Pro</div>
                  <span className="text-3xl font-black">4x</span>
                  <span className="text-xs font-medium opacity-80">Kualitas Maksimum 4K</span>
                </Button>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-4 rounded-xl text-sm leading-relaxed shadow-sm">
                💡 <strong>Tips:</strong> AI Upscaler akan memperbaiki noise dan mengembalikan tekstur yang hilang pada foto produk Anda. Cocok untuk foto dari kamera HP lama agar terlihat seperti standar studio kreatif.
              </div>

              <Button 
                onClick={handleGenerate} 
                className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95" 
                size="lg" 
                disabled={loading}
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Menjernihkan (20s)...</> : "✨ Upscale & Enhance Gambar"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Tarik Slider untuk Membandingkan</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" objectFit="contain" />

            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="outline" onClick={() => setStep(1)}>
                Upload Foto Lain
              </Button>
              <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-5 h-5" /> Download HD
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

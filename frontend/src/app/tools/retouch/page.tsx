"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, PenSquare, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";

export default function RetouchPage() {
  const router = useRouter();
  const api = useProjectApi();
  const [step, setStep] = useState(1);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg');

  const handleFileSelect = async (file: File) => {
    setStep(2); // Show loading state

    try {
      const data = await api.retouchImage(file, outputFormat);
      setResultUrl(data.url);
      setBeforeUrl(data.before_url);
      setStep(3); // Show result
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
      setStep(1); // Go back if failed
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => step === 3 ? setStep(1) : router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Auto-Retouch & Color Correction
          </h1>
          <p className="text-muted-foreground mt-2">Foto gelap atau ada noda di wajah? AI kami otomatis perbaiki pencahayaan dan kulit \u2014 hasilnya tetap natural.</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex justify-end items-center mr-2">
              <label className="text-sm font-medium mr-2 text-foreground/80">Format Output:</label>
              <select 
                  className="bg-transparent border border-border rounded-lg p-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value as 'jpeg' | 'png')}
              >
                  <option value="jpeg">JPEG (Kecil)</option>
                  <option value="png">PNG (Transparan/High Quality)</option>
              </select>
            </div>
            <ImageDropzone onFileSelect={handleFileSelect} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h3 className="text-xl font-semibold">Sedang Menganalisa & Memperbaiki Foto...</h3>
            <p className="text-muted-foreground max-w-md">Ai kami sedang menyeimbangkan pencahayaan dan menghaluskan noda tanpa menghilangkan detail alami.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Hasil Akhir</h3>
            <BeforeAfterSlider beforeImage={beforeUrl} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" />

            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <Button size="lg" variant="outline" onClick={() => setStep(1)}>
                <span className="mr-2">♻️</span> Foto Lain
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

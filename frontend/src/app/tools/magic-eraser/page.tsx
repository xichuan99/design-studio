"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { CanvasMaskPainter } from "@/components/tools/CanvasMaskPainter";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { CreditCostBadge } from "@/components/credits/CreditCostBadge";

export default function MagicEraserPage() {
  const router = useRouter();
  const api = useProjectApi();
  
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleMaskComplete = async (maskBlob: Blob) => {
    if (!originalFile) return;
    
    setStep(3); // Loading state

    try {
      // Need to convert blob to File object
      const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
      
      const data = await api.magicEraser(originalFile, maskFile);
      setResultUrl(data.url);
      setStep(4);
      toast.success("Objek berhasil dihapus!");
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
      setStep(2); // Back to drawing board on error
    } finally {
      // Done processing
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-8 w-full">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground transition-colors" 
          onClick={() => step > 1 && step < 4 ? setStep(step - 1) : router.push("/tools")}
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-jakarta font-bold text-foreground">Magic Eraser</h1>
            <p className="text-muted-foreground mt-2">
              Coret bagian yang ingin dihapus dari foto \u2014 bisa orang, noda, atau objek apapun. AI yang bersihkan.
            </p>
          </div>
          <CreditCostBadge cost={20} className="mt-2" />
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="max-w-3xl mx-auto bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h3 className="text-xl font-semibold mb-4 text-center">Tandai Objek yang Ingin Dihapus</h3>
              <CanvasMaskPainter 
                imageUrl={previewOriginal} 
                onMaskComplete={handleMaskComplete} 
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Sedang Menghapus Objek</h3>
            <p className="text-muted-foreground text-center max-w-md">
              AI sedang menganalisis gambar dan mengisi bagian yang dihapus dengan area sekitarnya secara natural.
              Proses ini memakan waktu sekitar 15-30 detik.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <h3 className="text-xl font-bold text-center">Hasil Magic Eraser</h3>
            
            <div className="bg-card p-4 sm:p-6 rounded-2xl border shadow-sm">
              <BeforeAfterSlider 
                beforeImage={previewOriginal} 
                afterImage={resultUrl} 
                className="shadow-md ring-1 ring-border rounded-xl" 
                objectFit="contain" 
              />
            </div>

            <div className="flex flex-wrap gap-4 justify-center bg-muted/30 p-6 rounded-2xl border">
              <Button size="lg" variant="outline" onClick={() => setStep(1)} className="bg-background">
                Upload Foto Lain
              </Button>
              <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-5 h-5" /> Download Hasil
              </Button>
              <Button size="lg" variant="secondary" className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200" onClick={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}>
                <PenSquare className="w-5 h-5" /> Lanjut ke Editor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

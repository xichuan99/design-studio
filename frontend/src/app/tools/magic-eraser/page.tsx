"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { CanvasMaskPainter } from "@/components/tools/CanvasMaskPainter";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";
import { CreditCostBadge } from "@/components/credits/CreditCostBadge";
import { QualityToggle } from "@/components/tools/QualityToggle";

export default function MagicEraserPage() {
  const router = useRouter();
  const api = useProjectApi();
  
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [erasePrompt, setErasePrompt] = useState<string>("");
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();

  const [modelQuality, setModelQuality] = useState<"standard" | "ultra">("standard");

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleMaskComplete = async (maskBlob: Blob) => {
    if (!originalFile) return;
    
    setStep(3); // Loading state

    try {
      const maskBuffer = await maskBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", maskBuffer);
      const maskHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
      const [uploadedOriginal, uploadedMask] = await Promise.all([
        api.uploadImage(originalFile),
        api.uploadImage(maskFile),
      ]);

      await startToolJob({
        toolName: "magic_eraser",
        payload: {
          image_url: uploadedOriginal.url,
          mask_url: uploadedMask.url,
          ...(erasePrompt.trim() ? { prompt: erasePrompt.trim() } : {}),
        },
        quality: modelQuality,
        idempotencyKey: `${originalFile.name}:${originalFile.size}:${originalFile.lastModified}:${modelQuality}:${erasePrompt.trim()}:${maskHash}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultUrl(job.result_url);
            setStep(4);
            toast.success("Objek berhasil dihapus!");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses magic eraser gagal");
          setStep(2);
        },
        onCanceled: () => {
          toast.message("Proses magic eraser dibatalkan");
          setStep(2);
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status magic eraser");
          }
          setStep(2);
        },
      });
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
      setStep(2); // Back to drawing board on error
    }
  };

  const handleCancel = async () => {
    await cancelActiveJob({
      onCanceled: () => {
        toast.message("Proses magic eraser dibatalkan");
        setStep(2);
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Gagal membatalkan proses");
        }
      },
    });
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
            <CreditCostBadge cost={modelQuality === "ultra" ? 40 : 20} className="mt-2" />
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="max-w-3xl mx-auto bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h3 className="text-xl font-semibold mb-4 text-center">Tandai Objek yang Ingin Dihapus</h3>
              <QualityToggle
                value={modelQuality}
                onChange={setModelQuality}
                standardCost={20}
                disabled={loading}
                className="mb-4"
              />
              <div className="mb-4 space-y-1">
                <label className="text-xs text-muted-foreground">Petunjuk AI (opsional)</label>
                <Input
                  value={erasePrompt}
                  onChange={(e) => setErasePrompt(e.target.value)}
                  placeholder="Contoh: hapus orang di kanan, isi jadi dinding polos"
                  className="bg-background"
                />
              </div>
              <CanvasMaskPainter 
                imageUrl={previewOriginal} 
                onMaskComplete={handleMaskComplete} 
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <ToolProcessingState
            loading={loading || step === 3}
            job={activeJob}
            defaultMessage="AI sedang menghapus objek"
            description="AI sedang menganalisis gambar dan mengisi area yang dihapus secara natural."
            onCancel={handleCancel}
            variant="centered"
          />
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

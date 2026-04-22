"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { ResultActionCard } from "@/components/tools/ResultActionCard";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";
import { CreditCostBadge } from "@/components/credits/CreditCostBadge";
import { CreditConfirmDialog } from "@/components/credits/CreditConfirmDialog";

export default function UpscalerPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [scale, setScale] = useState<number>(2);
  const [resultUrl, setResultUrl] = useState<string>("");
  const api = useProjectApi();
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();

  const handleFileSelect = (file: File) => {
    if (previewOriginal) URL.revokeObjectURL(previewOriginal);
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!originalFile) return;

    try {
      const uploaded = await api.uploadImage(originalFile);
      await startToolJob({
        toolName: "upscale",
        payload: {
          image_url: uploaded.url,
          scale,
        },
        idempotencyKey: `${originalFile.name}:${originalFile.size}:${originalFile.lastModified}:${scale}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultUrl(job.result_url);
            setStep(3);
            toast.success("Upscale selesai");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses upscale gagal");
        },
        onCanceled: () => {
          toast.message("Proses upscale dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status proses AI");
          }
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
    }
  };

  const handleCancel = async () => {
    await cancelActiveJob({
      onCanceled: () => toast.message("Proses upscale dibatalkan"),
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Gagal membatalkan job");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Image Upscaler</h1>
            <p className="text-muted-foreground mt-2">Foto dari HP buram atau kecil? Perbesar hingga 4x lipat supaya layak pajang di toko online.</p>
          </div>
          <CreditCostBadge cost={10} className="mt-2" />
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

              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl text-sm leading-relaxed shadow-sm">
                💡 <strong>Tips:</strong> AI Upscaler akan memperbaiki noise dan mengembalikan tekstur yang hilang pada foto produk Anda. Cocok untuk foto dari kamera HP lama agar terlihat seperti standar studio kreatif.
              </div>

              <CreditConfirmDialog
                title="AI Image Upscaler"
                description={`AI akan meningkatkan resolusi gambar sebanyak ${scale}x lipat. Ini akan memotong 10 kredit.`}
                cost={10}
                onConfirm={handleGenerate}
                disabled={loading || !originalFile}
              >
                <Button 
                  className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95" 
                  size="lg" 
                  disabled={loading || !originalFile}
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {activeJob?.phase_message || "Menjalankan AI Upscaler..."}</> : "✨ Upscale & Enhance Gambar"}
                </Button>
              </CreditConfirmDialog>

              <ToolProcessingState
                loading={loading}
                job={activeJob}
                defaultMessage="Menjalankan AI Upscaler..."
                onCancel={handleCancel}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Versi resolusi tinggi sudah siap</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" objectFit="contain" />

            <ResultActionCard
              title="Gunakan hasil upscale ini"
              description="Lanjutkan ke editor, download versi HD, ulangi dengan foto lain, atau kembali ke daftar tools."
              onContinue={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}
              onDownload={() => window.open(resultUrl, "_blank")}
              onRetry={() => setStep(1)}
              onBack={() => router.push("/tools")}
              retryLabel="Upload Foto Lain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

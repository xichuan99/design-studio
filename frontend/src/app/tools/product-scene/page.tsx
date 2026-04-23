"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { ResultActionCard } from "@/components/tools/ResultActionCard";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { QualityToggle } from "@/components/tools/QualityToggle";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";
import { CreditCostBadge } from "@/components/credits/CreditCostBadge";
import { CreditConfirmDialog } from "@/components/credits/CreditConfirmDialog";

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
  const [modelQuality, setModelQuality] = useState<"standard" | "ultra">("standard");
  const [resultUrl, setResultUrl] = useState<string>("");
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();
  const api = useProjectApi();

  const handleFileSelect = (file: File) => {
    if (previewOriginal) URL.revokeObjectURL(previewOriginal);
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!originalFile || !theme) return;

    try {
      const uploaded = await api.uploadImage(originalFile);
      await startToolJob({
        toolName: "product_scene",
        payload: {
          image_url: uploaded.url,
          theme,
          aspect_ratio: aspectRatio,
        },
        quality: modelQuality,
        idempotencyKey: `${originalFile.name}:${originalFile.size}:${originalFile.lastModified}:${theme}:${aspectRatio}:${modelQuality}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultUrl(job.result_url);
            setStep(3);
            toast.success("Product scene selesai");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses product scene gagal");
        },
        onCanceled: () => {
          toast.message("Proses product scene dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status product scene");
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
      onCanceled: () => toast.message("Proses product scene dibatalkan"),
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Gagal membatalkan proses");
        }
      },
    });
  };

  const creditCost = modelQuality === "ultra" ? 80 : 40;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 select-none">
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 1 ? "bg-primary text-primary-foreground shadow-md" : step > 1 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">1</span>
            <span className="hidden sm:inline">Upload Produk</span>
          </div>
          <div className={`w-4 sm:w-8 h-[2px] ${step > 1 ? "bg-primary/40" : "bg-border"}`}></div>
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 2 ? "bg-primary text-primary-foreground shadow-md" : step > 2 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">2</span>
            <span className="hidden sm:inline">Pilih Tema</span>
          </div>
          <div className={`w-4 sm:w-8 h-[2px] ${step > 2 ? "bg-primary/40" : "bg-border"}`}></div>
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 3 ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">3</span>
            <span className="hidden sm:inline">Hasil</span>
          </div>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Product Scene</h1>
            <p className="text-muted-foreground mt-2">Tidak perlu sewa studio. Upload foto produk Anda, pilih suasana, dan langsung dapat foto profesional.</p>
          </div>
          <CreditCostBadge cost={creditCost} className="mt-2" />
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Foto Produk (Preview)</h3>
              <div className="flex items-center justify-center p-4 bg-muted/20 border rounded-xl min-h-[300px]">
                <div
                  className={`bg-muted/50 rounded-xl overflow-hidden border border-border shadow-inner relative transition-all duration-500 ease-in-out w-full max-h-[500px] ${
                    aspectRatio === "1:1" ? "aspect-square max-w-[400px]" :
                    aspectRatio === "9:16" ? "aspect-[9/16] max-w-[280px]" :
                    "aspect-video max-w-[500px]"
                  }`}
                >
                  <Image src={previewOriginal} alt="Original" fill className="object-contain p-2 transition-all duration-500" unoptimized />
                </div>
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
                  {["1:1", "9:16", "16:9"].map((ratio) => (
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

              <QualityToggle
                value={modelQuality}
                onChange={setModelQuality}
                standardCost={40}
                disabled={loading}
              />

              <ToolProcessingState
                loading={loading}
                job={activeJob}
                defaultMessage="AI sedang membuat product scene"
                onCancel={handleCancel}
              />

              <CreditConfirmDialog
                title="AI Product Scene"
                description={`AI akan membuat latar belakang produk baru dengan tema yang dipilih (${modelQuality === "ultra" ? "gpt-image-2 Ultra ✨" : "Standard"}). Ini akan memotong ${creditCost} kredit.`}
                cost={creditCost}
                onConfirm={handleGenerate}
                disabled={loading || !originalFile}
              >
                <Button
                  className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95 py-6 text-base"
                  size="lg"
                  disabled={loading || !originalFile}
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses dengan AI (30s)...</> : <><Sparkles className="w-5 h-5 mr-2" /> Buat Foto Produk</>}
                </Button>
              </CreditConfirmDialog>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Scene produk baru siap dipakai</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" />

            <ResultActionCard
              title="Pilih langkah berikutnya"
              description="Teruskan scene ini ke editor, simpan hasilnya, ubah tema, atau kembali ke tools lain."
              onContinue={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}
              onDownload={() => window.open(resultUrl, "_blank")}
              onRetry={() => setStep(2)}
              onBack={() => router.push("/tools")}
              retryLabel="Ganti Tema"
            />
          </div>
        )}
      </div>
    </div>
  );
}

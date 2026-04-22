"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { ResultActionCard } from "@/components/tools/ResultActionCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";

type RetouchLevel = "natural" | "balanced" | "maximal";
type OutputFormat = "jpeg" | "png";

const RETOUCH_LEVELS: { id: RetouchLevel; label: string; emoji: string; desc: string; fidelity: number }[] = [
  { id: "natural",  label: "Natural",   emoji: "🌿", desc: "Sedikit perbaikan, wajah tetap asli",   fidelity: 0.8 },
  { id: "balanced", label: "Seimbang",  emoji: "✨", desc: "Balance antara enhancement & natural",    fidelity: 0.5 },
  { id: "maximal",  label: "Maksimal",  emoji: "💫", desc: "Enhancement kuat, hasil lebih polished", fidelity: 0.2 },
];

export default function RetouchPage() {
  const router = useRouter();
  const api = useProjectApi();
  const [step, setStep] = useState(1);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpeg");
  const [retouchLevel, setRetouchLevel] = useState<RetouchLevel>("balanced");
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();

  const selectedLevel = RETOUCH_LEVELS.find((l) => l.id === retouchLevel)!;

  const handleFileSelect = async (file: File) => {
    setStep(2);
    try {
      const uploaded = await api.uploadImage(file);
      setBeforeUrl(uploaded.url);

      await startToolJob({
        toolName: "retouch",
        payload: {
          image_url: uploaded.url,
          output_format: outputFormat,
          fidelity: selectedLevel.fidelity,
        },
        idempotencyKey: `${file.name}:${file.size}:${file.lastModified}:${outputFormat}:${selectedLevel.id}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultUrl(job.result_url);
            setStep(3);
            toast.success("Retouch selesai");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses retouch gagal");
          setStep(1);
        },
        onCanceled: () => {
          toast.message("Proses retouch dibatalkan");
          setStep(1);
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status retouch");
          }
          setStep(1);
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
      setStep(1);
    }
  };

  const handleCancel = async () => {
    await cancelActiveJob({
      onCanceled: () => {
        toast.message("Proses retouch dibatalkan");
        setStep(1);
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Gagal membatalkan proses retouch");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button
          variant="ghost"
          className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => (step === 3 ? setStep(1) : router.push("/tools"))}
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Auto-Retouch &amp; Color Correction
          </h1>
          <p className="text-muted-foreground mt-2">
            Foto gelap atau ada noda di wajah? AI kami otomatis perbaiki pencahayaan dan kulit — hasilnya tetap natural.
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Retouch level selector */}
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-3">
                Tingkat Retouch
              </label>
              <div className="grid grid-cols-3 gap-3">
                {RETOUCH_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setRetouchLevel(level.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-all cursor-pointer ${
                      retouchLevel === level.id
                        ? "border-primary bg-primary/10 text-primary shadow-md"
                        : "border-border bg-card text-foreground/70 hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-2xl">{level.emoji}</span>
                    <span className="text-sm font-semibold">{level.label}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{level.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Output format selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground/80">Format Output:</label>
              <select
                className="bg-transparent border border-border rounded-lg p-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
              >
                <option value="jpeg">JPEG (Kecil)</option>
                <option value="png">PNG (Transparan/High Quality)</option>
              </select>
            </div>

            <ImageDropzone onFileSelect={handleFileSelect} />
          </div>
        )}

        {step === 2 && (
          <ToolProcessingState
            loading={loading}
            job={activeJob}
            variant="centered"
            defaultMessage="Sedang Menganalisa & Memperbaiki Foto..."
            description="AI kami sedang menyeimbangkan pencahayaan dan menghaluskan noda tanpa menghilangkan detail alami."
            onCancel={handleCancel}
          />
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Foto yang sudah dirapikan siap dipakai</h3>
            <BeforeAfterSlider
              beforeImage={beforeUrl}
              afterImage={resultUrl}
              className="shadow-2xl ring-1 ring-border"
            />

            <ResultActionCard
              title="Lanjutkan foto ini"
              description="Buka di editor untuk menambah layout dan teks, simpan hasilnya, proses foto lain, atau kembali ke daftar tools."
              onContinue={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}
              onDownload={() => window.open(resultUrl, "_blank")}
              onRetry={() => setStep(1)}
              onBack={() => router.push("/tools")}
              retryLabel="Proses Foto Lain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

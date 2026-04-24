"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { PipelineBuilder, type StageId } from "@/components/tools/PipelineBuilder";
import { ResultActionCard } from "@/components/tools/ResultActionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { useProjectApi, type PipelineStageRequest } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";

const DEFAULT_STAGE_ORDER: StageId[] = [
  "remove_bg",
  "inpaint_bg",
  "generate_bg",
  "watermark",
];

const WATERMARK_POSITIONS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
  "center",
  "tiled",
] as const;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

export default function TransformPipelinePage() {
  const router = useRouter();
  const api = useProjectApi();
  const { loading, activeJob, startPipelineJob, cancelActiveJob } = useToolJobProgress();
  const [previewLoading, setPreviewLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const [stageOrder, setStageOrder] = useState<StageId[]>(DEFAULT_STAGE_ORDER);

  const [enableRemoveBg, setEnableRemoveBg] = useState(true);
  const [enableInpaintBg, setEnableInpaintBg] = useState(false);
  const [enableGenerateBg, setEnableGenerateBg] = useState(false);
  const [enableWatermark, setEnableWatermark] = useState(false);

  const [inpaintPrompt, setInpaintPrompt] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState("0.55");
  const [watermarkScale, setWatermarkScale] = useState("0.22");
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);

  const buildStages = useMemo(() => {
    const stageMap: Record<StageId, PipelineStageRequest | null> = {
      remove_bg: enableRemoveBg ? { type: "remove_bg", params: {} } : null,
      inpaint_bg: enableInpaintBg
        ? {
            type: "inpaint_bg",
            params: { prompt: inpaintPrompt.trim() },
          }
        : null,
      generate_bg: enableGenerateBg
        ? {
            type: "generate_bg",
            params: { visual_prompt: generatePrompt.trim() },
          }
        : null,
      watermark: enableWatermark
        ? {
            type: "watermark",
            params: {
              position: watermarkPosition,
              opacity: Number(watermarkOpacity),
              scale: Number(watermarkScale),
            },
          }
        : null,
    };

    const nextStages: PipelineStageRequest[] = [];
    for (const stageId of stageOrder) {
      const mapped = stageMap[stageId];
      if (mapped) {
        nextStages.push(mapped);
      }
    }
    return nextStages;
  }, [
    stageOrder,
    enableGenerateBg,
    enableInpaintBg,
    enableRemoveBg,
    enableWatermark,
    generatePrompt,
    inpaintPrompt,
    watermarkOpacity,
    watermarkPosition,
    watermarkScale,
  ]);

  const stages = buildStages;

  const applyPreset = (preset: "quick_cutout" | "studio_rebuild" | "branded_ready") => {
    if (preset === "quick_cutout") {
      setEnableRemoveBg(true);
      setEnableInpaintBg(false);
      setEnableGenerateBg(false);
      setEnableWatermark(false);
      setStageOrder(["remove_bg", "inpaint_bg", "generate_bg", "watermark"]);
      return;
    }

    if (preset === "studio_rebuild") {
      setEnableRemoveBg(true);
      setEnableInpaintBg(true);
      setEnableGenerateBg(false);
      setEnableWatermark(false);
      setInpaintPrompt((prev) => prev || "clean studio background, soft natural shadows");
      setStageOrder(["remove_bg", "inpaint_bg", "generate_bg", "watermark"]);
      return;
    }

    setEnableRemoveBg(true);
    setEnableInpaintBg(false);
    setEnableGenerateBg(true);
    setEnableWatermark(true);
    setGeneratePrompt((prev) => prev || "minimal premium studio backdrop, soft gradient");
    setStageOrder(["remove_bg", "generate_bg", "watermark", "inpaint_bg"]);
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stageOrder.length) return;
    setStageOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const setEnabled = (stageId: StageId, enabled: boolean) => {
    if (stageId === "remove_bg") setEnableRemoveBg(enabled);
    if (stageId === "inpaint_bg") setEnableInpaintBg(enabled);
    if (stageId === "generate_bg") setEnableGenerateBg(enabled);
    if (stageId === "watermark") setEnableWatermark(enabled);
  };

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setResultUrl("");
    setStep(2);
  };

  const handleWatermarkFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWatermarkFile(file);
  };

  const handleRunPipeline = async () => {
    try {
      const { imageBytes, resolvedStages } = await preparePipelinePayload();

      await startPipelineJob({
        imageBytes,
        stages: resolvedStages,
        metadata: {
          source: "tools_transform_page",
          source_mode: "image_bytes",
          stage_count: resolvedStages.length,
          ordered_stages: stageOrder,
        },
        quality: "standard",
        idempotencyKey: `${originalFile?.name || "file"}:${originalFile?.size || 0}:${originalFile?.lastModified || 0}:${stageOrder.join(",")}:${resolvedStages.length}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultUrl(job.result_url);
            setStep(3);
            toast.success("Pipeline transformasi selesai");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Pipeline transformasi gagal");
        },
        onCanceled: () => {
          toast.message("Pipeline transformasi dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status pipeline");
          }
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Terjadi kesalahan saat menjalankan pipeline");
      }
    }
  };

  const preparePipelinePayload = async () => {
    if (!originalFile) {
      throw new Error("File input belum dipilih");
    }
    if (stages.length === 0) {
      toast.error("Pilih minimal satu stage transformasi.");
      throw new Error("Tahap pipeline kosong");
    }
    if (enableInpaintBg && !enableRemoveBg) {
      toast.error("Stage inpaint membutuhkan remove background aktif di flow ini.");
      throw new Error("Konfigurasi stage tidak valid");
    }
    if (enableInpaintBg && !inpaintPrompt.trim()) {
      toast.error("Isi prompt untuk stage inpaint background.");
      throw new Error("Prompt inpaint kosong");
    }
    if (enableGenerateBg && !generatePrompt.trim()) {
      toast.error("Isi prompt untuk stage generate background.");
      throw new Error("Prompt generate kosong");
    }
    if (enableWatermark && !WATERMARK_POSITIONS.includes(watermarkPosition as typeof WATERMARK_POSITIONS[number])) {
      toast.error("Posisi watermark tidak valid.");
      throw new Error("Posisi watermark tidak valid");
    }
    if (enableWatermark) {
      const parsedOpacity = Number(watermarkOpacity);
      const parsedScale = Number(watermarkScale);
      if (Number.isNaN(parsedOpacity) || parsedOpacity < 0 || parsedOpacity > 1) {
        toast.error("Opacity watermark harus di antara 0.0 sampai 1.0.");
        throw new Error("Opacity watermark tidak valid");
      }
      if (Number.isNaN(parsedScale) || parsedScale < 0.05 || parsedScale > 1) {
        toast.error("Scale watermark harus di antara 0.05 sampai 1.0.");
        throw new Error("Scale watermark tidak valid");
      }
    }
    if (enableWatermark && !watermarkFile) {
      toast.error("Upload logo watermark terlebih dahulu.");
      throw new Error("Logo watermark kosong");
    }

    const imageBytes = await fileToDataUrl(originalFile);

    let watermarkBytes: string | null = null;
    if (enableWatermark && watermarkFile) {
      watermarkBytes = await fileToDataUrl(watermarkFile);
    }

    const resolvedStages = stages.map((stage) => {
      if (stage.type !== "watermark") return stage;
      return {
        ...stage,
        params: {
          ...(stage.params || {}),
          watermark_bytes: watermarkBytes,
        },
      };
    });

    return { imageBytes, resolvedStages };
  };

  const handleRunPreview = async () => {
    try {
      setPreviewLoading(true);
      const { imageBytes, resolvedStages } = await preparePipelinePayload();
      const preview = await api.executePipelinePreview({
        image_bytes: imageBytes,
        stages: resolvedStages,
        metadata: {
          source: "tools_transform_page",
          mode: "sync_preview",
        },
        save_result: true,
        output_content_type: "image/jpeg",
      });

      setResultUrl(preview.url);
      setStep(3);
      toast.success("Preview pipeline selesai");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Gagal menjalankan preview pipeline");
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCancel = async () => {
    await cancelActiveJob({
      onCanceled: () => toast.message("Pipeline transformasi dibatalkan"),
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
          className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => (step > 1 && step < 3 ? setStep(1) : router.push("/tools"))}
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground flex items-center gap-3">
            <Workflow className="w-8 h-8 text-teal-500" />
            AI Transform Pipeline
          </h1>
          <p className="text-muted-foreground mt-2">
            Gabungkan beberapa transformasi dalam satu proses: remove background, inpaint/generate background, lalu watermark.
          </p>

          {/* Step indicator — Stitch progress pattern */}
          <nav aria-label="Langkah proses" className="mt-5">
            <ol className="flex items-center gap-1 sm:gap-2">
              {(["Upload", "Konfigurasi", "Hasil"] as const).map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                return (
                  <li key={label} className="flex items-center gap-1 sm:gap-2">
                    <span
                      aria-current={isActive ? "step" : undefined}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isDone
                          ? "bg-itp-success/20 text-itp-success"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      <span className="h-4 w-4 inline-flex items-center justify-center rounded-full border border-current text-[10px] shrink-0">
                        {stepNum}
                      </span>
                      <span className="hidden sm:inline">{label}</span>
                    </span>
                    {idx < 2 && (
                      <span aria-hidden="true" className="h-px w-4 sm:w-6 bg-border shrink-0" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {step === 1 && <ImageDropzone onFileSelect={handleFileSelect} />}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Preview Input</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-square rounded-xl border bg-muted/30 overflow-hidden">
                  {previewOriginal && (
                    <Image src={previewOriginal} alt="Input" fill className="object-contain p-2" unoptimized />
                  )}
                </div>
              </CardContent>
            </Card>

            <PipelineBuilder
              stageOrder={stageOrder}
              enableRemoveBg={enableRemoveBg}
              enableInpaintBg={enableInpaintBg}
              enableGenerateBg={enableGenerateBg}
              enableWatermark={enableWatermark}
              inpaintPrompt={inpaintPrompt}
              generatePrompt={generatePrompt}
              watermarkPosition={watermarkPosition}
              watermarkOpacity={watermarkOpacity}
              watermarkScale={watermarkScale}
              loading={loading}
              previewLoading={previewLoading}
              activeJob={activeJob}
              hasOriginalFile={Boolean(originalFile)}
              activeStageCount={stages.length}
              onApplyPreset={applyPreset}
              onMoveStage={moveStage}
              onSetEnabled={setEnabled}
              onSetEnableRemoveBg={setEnableRemoveBg}
              onSetEnableInpaintBg={setEnableInpaintBg}
              onSetEnableGenerateBg={setEnableGenerateBg}
              onSetEnableWatermark={setEnableWatermark}
              onSetInpaintPrompt={setInpaintPrompt}
              onSetGeneratePrompt={setGeneratePrompt}
              onSetWatermarkPosition={setWatermarkPosition}
              onSetWatermarkOpacity={setWatermarkOpacity}
              onSetWatermarkScale={setWatermarkScale}
              onWatermarkFileChange={handleWatermarkFileSelect}
              onRunPipeline={handleRunPipeline}
              onRunPreview={handleRunPreview}
              onCancel={handleCancel}
              watermarkPositions={WATERMARK_POSITIONS}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-center">Hasil pipeline siap</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-xl" />
            <ResultActionCard
              onContinue={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}
              onDownload={() => window.open(resultUrl, "_blank")}
              onRetry={() => setStep(2)}
              onBack={() => router.push("/tools")}
              retryLabel="Ubah Pipeline"
            />
          </div>
        )}
      </div>
    </div>
  );
}

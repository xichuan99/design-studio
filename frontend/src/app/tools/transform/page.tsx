"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { PipelineBuilder, type StageId } from "@/components/tools/PipelineBuilder";
import { ResultActionCard } from "@/components/tools/ResultActionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eraser, Layers, Scissors, Sparkles, Wand2, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToolHandoff } from "@/hooks/useToolHandoff";
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

type IntentKey = "quick_fix" | "background" | "scene" | "remove_object" | "bulk";

const INTENTS: {
  key: IntentKey;
  title: string;
  description: string;
  creditEstimate: string;
  runtimeEstimate: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "quick_fix",
    title: "Perbaiki Cepat",
    description: "Auto-fix pencahayaan dan kebersihan foto dalam satu klik.",
    creditEstimate: "Estimasi 1-2 kredit",
    runtimeEstimate: "~10-20 detik",
    Icon: Sparkles,
  },
  {
    key: "background",
    title: "Hapus / Ganti Background",
    description: "Pisahkan produk dan buat background baru yang lebih clean.",
    creditEstimate: "Estimasi 2-4 kredit",
    runtimeEstimate: "~20-40 detik",
    Icon: Scissors,
  },
  {
    key: "scene",
    title: "Buat Scene Produk",
    description: "Ubah foto jadi scene produk siap jual dengan look premium.",
    creditEstimate: "Estimasi 3-6 kredit",
    runtimeEstimate: "~30-60 detik",
    Icon: Wand2,
  },
  {
    key: "remove_object",
    title: "Hapus Objek Pengganggu",
    description: "Bersihkan elemen yang mengganggu supaya fokus ke produk utama.",
    creditEstimate: "Estimasi 2-4 kredit",
    runtimeEstimate: "~20-45 detik",
    Icon: Eraser,
  },
  {
    key: "bulk",
    title: "Proses Banyak Foto",
    description: "Arahkan ke alur batch untuk memproses banyak file sekaligus.",
    creditEstimate: "Estimasi sesuai jumlah file",
    runtimeEstimate: "Tergantung volume",
    Icon: Layers,
  },
];

const INTENT_META: Record<IntentKey, { creditEstimate: string; runtimeEstimate: string }> = {
  quick_fix: { creditEstimate: "1-2", runtimeEstimate: "10-20s" },
  background: { creditEstimate: "2-4", runtimeEstimate: "20-40s" },
  scene: { creditEstimate: "3-6", runtimeEstimate: "30-60s" },
  remove_object: { creditEstimate: "2-4", runtimeEstimate: "20-45s" },
  bulk: { creditEstimate: "variable", runtimeEstimate: "variable" },
};

type TransformEventName =
  | "file_selected"
  | "intent_recommended"
  | "intent_selected"
  | "advanced_toggled"
  | "preview_requested"
  | "run_requested";

interface TransformEventLog {
  event: TransformEventName;
  timestamp: string;
  payload: Record<string, unknown>;
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    image.src = objectUrl;
  });
}

async function recommendIntentForFile(file: File): Promise<{ intent: IntentKey; reason: string }> {
  const lowerName = file.name.toLowerCase();
  const dims = await getImageDimensions(file);

  if (/batch|bulk|zip/.test(lowerName)) {
    return { intent: "bulk", reason: "Nama file mengindikasikan proses massal." };
  }

  if (/scene|studio|lifestyle/.test(lowerName)) {
    return { intent: "scene", reason: "Nama file cocok untuk pembuatan scene produk." };
  }

  if (/erase|remove|clean/.test(lowerName)) {
    return { intent: "remove_object", reason: "Nama file mengarah ke pembersihan objek pengganggu." };
  }

  if (/bg|background|cutout|transparent/.test(lowerName)) {
    return { intent: "background", reason: "Nama file mengarah ke workflow background." };
  }

  if (dims) {
    const ratio = dims.width / Math.max(dims.height, 1);
    if (ratio > 1.65 || ratio < 0.65) {
      return { intent: "scene", reason: "Rasio gambar ekstrem lebih cocok untuk komposisi scene." };
    }

    if (dims.width < 900 || dims.height < 900) {
      return { intent: "quick_fix", reason: "Resolusi kecil cocok diproses cepat untuk perbaikan ringan." };
    }
  }

  return { intent: "quick_fix", reason: "Workflow default untuk perbaikan cepat satu foto." };
}

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
  const { openInEditor, isLoading: handoffLoading } = useToolHandoff();
  const [previewLoading, setPreviewLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedIntent, setSelectedIntent] = useState<IntentKey>("quick_fix");
  const [recommendedIntent, setRecommendedIntent] = useState<IntentKey | null>(null);
  const [recommendedReason, setRecommendedReason] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  const eventLogRef = useRef<TransformEventLog[]>([]);

  const trackEvent = (event: TransformEventName, payload: Record<string, unknown>) => {
    const log: TransformEventLog = {
      event,
      timestamp: new Date().toISOString(),
      payload,
    };
    eventLogRef.current = [...eventLogRef.current.slice(-19), log];
    if (process.env.NODE_ENV !== "production") {
      console.info("[transform-tracking]", log);
    }
  };

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

  const applyIntent = (intent: IntentKey) => {
    trackEvent("intent_selected", {
      selected_intent: intent,
      previous_intent: selectedIntent,
      recommended_intent: recommendedIntent,
      step,
    });
    setSelectedIntent(intent);

    if (intent === "quick_fix") {
      applyPreset("quick_cutout");
      return;
    }

    if (intent === "background") {
      setEnableRemoveBg(true);
      setEnableInpaintBg(true);
      setEnableGenerateBg(false);
      setEnableWatermark(false);
      setInpaintPrompt((prev) => prev || "clean studio background, realistic soft shadows");
      setStageOrder(["remove_bg", "inpaint_bg", "generate_bg", "watermark"]);
      return;
    }

    if (intent === "scene") {
      setEnableRemoveBg(true);
      setEnableInpaintBg(false);
      setEnableGenerateBg(true);
      setEnableWatermark(false);
      setGeneratePrompt((prev) => prev || "premium product scene, soft shadow, ecommerce lighting");
      setStageOrder(["remove_bg", "generate_bg", "inpaint_bg", "watermark"]);
      return;
    }

    if (intent === "remove_object") {
      setEnableRemoveBg(true);
      setEnableInpaintBg(true);
      setEnableGenerateBg(false);
      setEnableWatermark(false);
      setInpaintPrompt((prev) => prev || "remove distracting objects and reconstruct clean natural background");
      setStageOrder(["remove_bg", "inpaint_bg", "generate_bg", "watermark"]);
      return;
    }

    setEnableRemoveBg(true);
    setEnableInpaintBg(false);
    setEnableGenerateBg(false);
    setEnableWatermark(false);
    setStageOrder(["remove_bg", "inpaint_bg", "generate_bg", "watermark"]);
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

  const handleFileSelect = async (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setResultUrl("");

    trackEvent("file_selected", {
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    });

    const recommendation = await recommendIntentForFile(file);
    setRecommendedIntent(recommendation.intent);
    setRecommendedReason(recommendation.reason);
    trackEvent("intent_recommended", {
      recommended_intent: recommendation.intent,
      reason: recommendation.reason,
    });

    setShowAdvanced(false);
    applyIntent(recommendation.intent);
    setStep(2);
  };

  const handleWatermarkFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWatermarkFile(file);
  };

  const handleRunPipeline = async () => {
    try {
      if (selectedIntent === "bulk") {
        toast.message("Untuk banyak foto, gunakan Batch Photo Processor.");
        router.push("/tools/batch-process");
        return;
      }

      trackEvent("run_requested", {
        selected_intent: selectedIntent,
        advanced_enabled: showAdvanced,
      });

      const { imageBytes, resolvedStages } = await preparePipelinePayload();

      await startPipelineJob({
        imageBytes,
        stages: resolvedStages,
        metadata: {
          source: "tools_transform_page",
          selected_intent: selectedIntent,
          recommended_intent: recommendedIntent,
          recommended_reason: recommendedReason,
          intent_credit_estimate: INTENT_META[selectedIntent].creditEstimate,
          intent_runtime_estimate: INTENT_META[selectedIntent].runtimeEstimate,
          interaction_events: eventLogRef.current,
          source_mode: "image_bytes",
          stage_count: resolvedStages.length,
          ordered_stages: stageOrder,
        },
        quality: "standard",
        idempotencyKey: `${selectedIntent}:${originalFile?.name || "file"}:${originalFile?.size || 0}:${originalFile?.lastModified || 0}:${stageOrder.join(",")}:${resolvedStages.length}`,
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
      if (selectedIntent === "bulk") {
        toast.message("Intent ini diarahkan ke Batch Photo Processor.");
        router.push("/tools/batch-process");
        return;
      }

      trackEvent("preview_requested", {
        selected_intent: selectedIntent,
        advanced_enabled: showAdvanced,
      });

      setPreviewLoading(true);
      const { imageBytes, resolvedStages } = await preparePipelinePayload();
      const preview = await api.executePipelinePreview({
        image_bytes: imageBytes,
        stages: resolvedStages,
        metadata: {
          source: "tools_transform_page",
          selected_intent: selectedIntent,
          recommended_intent: recommendedIntent,
          recommended_reason: recommendedReason,
          intent_credit_estimate: INTENT_META[selectedIntent].creditEstimate,
          intent_runtime_estimate: INTENT_META[selectedIntent].runtimeEstimate,
          interaction_events: eventLogRef.current,
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

  const selectedIntentConfig = INTENTS.find((intent) => intent.key === selectedIntent);

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
            <div className="space-y-5">
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

              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Mau diapain?</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INTENTS.map(({ key, title, description, creditEstimate, runtimeEstimate, Icon }) => {
                    const isActive = selectedIntent === key;
                    const isRecommended = recommendedIntent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyIntent(key)}
                        className={[
                          "text-left rounded-xl border p-3 transition-all",
                          isActive
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-primary/50 hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                            {isRecommended ? (
                              <span className="inline-flex mt-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                Recommended
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-full border px-2 py-0.5">{creditEstimate}</span>
                          <span>{runtimeEstimate}</span>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mode Opsi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-semibold text-foreground">Estimasi Intent Terpilih</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kredit: {selectedIntentConfig?.creditEstimate} · Durasi: {selectedIntentConfig?.runtimeEstimate}
                    </p>
                    {recommendedReason ? (
                      <p className="text-[11px] text-muted-foreground/90 mt-1.5">Alasan rekomendasi: {recommendedReason}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Advanced Controls</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aktifkan jika ingin atur urutan stage, prompt, dan watermark manual.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={showAdvanced ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowAdvanced((prev) => {
                          const next = !prev;
                          trackEvent("advanced_toggled", { enabled: next, selected_intent: selectedIntent });
                          return next;
                        });
                      }}
                    >
                      {showAdvanced ? "Aktif" : "Mati"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {selectedIntent === "bulk" ? (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Intent Batch</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Intent ini lebih optimal di Batch Photo Processor agar Anda bisa upload banyak foto sekaligus.
                    </p>
                    <Button className="w-full" onClick={() => router.push("/tools/batch-process")}>
                      Buka Batch Photo Processor
                    </Button>
                  </CardContent>
                </Card>
              ) : (
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
                  showAdvanced={showAdvanced}
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
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-center">Hasil pipeline siap</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-xl" />
            <ResultActionCard
              onContinue={() => openInEditor({ resultUrl, sourceTool: "transform" })}
              continueLoading={handoffLoading}
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

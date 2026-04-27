"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BatchImageDropzone } from "@/components/tools/BatchImageDropzone";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Layers, CheckCircle2, PenSquare, Import, SquareCheck } from "lucide-react";
import type { ImportQueueItem } from "@/lib/import-queue";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";
import { useToolHandoff } from "@/hooks/useToolHandoff";
import { QualityToggle } from "@/components/tools/QualityToggle";
import { IMPORT_QUEUE_ENABLED } from "@/lib/feature-flags";

const OPERATIONS = [
  { id: "remove_bg", name: "Hapus Latar Belakang", cost: 10, desc: "Hapus background foto produk secara otomatis" },
  { id: "product_scene", name: "AI Product Scene", cost: 40, desc: "Khusus foto produk non-manusia, dengan scene e-commerce yang lebih realistis" },
  { id: "watermark", name: "Watermark (Logo)", cost: 0, desc: "Tambahkan logo Anda ke semua foto" },
];

const THEMES = [
  { id: "studio", name: "Studio" },
  { id: "nature", name: "Alam" },
  { id: "cafe", name: "Cafe" },
];

const ASPECT_RATIOS = [
  { id: "1:1", name: "1:1" },
  { id: "4:5", name: "4:5" },
  { id: "16:9", name: "16:9" },
  { id: "9:16", name: "9:16" },
];

const COMPOSITE_PROFILES = [
  { id: "grounded", name: "Grounded (Rekomendasi)" },
  { id: "default", name: "Default" },
  { id: "soft", name: "Soft Shadow" },
];

const ULTRA_ENABLED_OPERATIONS = new Set(["product_scene"]);
const WATERMARK_POSITIONS = [
  { id: "top-left", name: "Kiri Atas" },
  { id: "top-right", name: "Kanan Atas" },
  { id: "bottom-left", name: "Kiri Bawah" },
  { id: "bottom-right", name: "Kanan Bawah" },
  { id: "center", name: "Tengah" },
  { id: "tiled", name: "Pattern (Penuh)" },
];
type VisibilityPreset = "subtle" | "balanced" | "protective";

export default function BatchProcessPage() {
  const router = useRouter();
  const posthog = usePostHog();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [operation, setOperation] = useState("remove_bg");
  
  // Extra configs
  const [theme, setTheme] = useState("studio");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [compositeProfile, setCompositeProfile] = useState("grounded");
  const [modelQuality, setModelQuality] = useState<"standard" | "ultra">("standard");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [watermarkScale, setWatermarkScale] = useState(20);
  const [watermarkVisibilityPreset, setWatermarkVisibilityPreset] = useState<VisibilityPreset>("balanced");

  const [resultUrl, setResultUrl] = useState<string>("");
  const [batchResult, setBatchResult] = useState<{success: number, error: number, errors: Array<{filename: string, error: string}>, itemResults: Array<{filename: string, result_url: string}>}>({success: 0, error: 0, errors: [], itemResults: []});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();
  const { openInEditor, isLoading: handoffLoading } = useToolHandoff();
  const api = useProjectApi();

  useEffect(() => {
    posthog?.capture("batch_process_step_changed", { step, files_count: files.length, operation });
  }, [files.length, operation, posthog, step]);

  useEffect(() => {
    if (step !== 3 || batchResult.itemResults.length === 0) return;
    posthog?.capture("tool_result_viewed", {
      tool_name: "batch",
      operation,
      success_count: batchResult.success,
      error_count: batchResult.error,
      item_count: batchResult.itemResults.length,
    });
  }, [batchResult.error, batchResult.itemResults.length, batchResult.success, operation, posthog, step]);

  const handleFilesSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStep(2);
  };

  const handleOperationChange = (nextOperation: string) => {
    setOperation(nextOperation);
    posthog?.capture("batch_operation_selected", { operation: nextOperation });
  };

  const handleQualityChange = (nextQuality: "standard" | "ultra") => {
    setModelQuality(nextQuality);
    posthog?.capture("batch_quality_toggled", { quality: nextQuality, operation });
  };

  const calculateTotalCost = () => {
    const op = OPERATIONS.find(o => o.id === operation);
    if (!op) return 0;
    const multiplier = ULTRA_ENABLED_OPERATIONS.has(operation) && modelQuality === "ultra" ? 2 : 1;
    return op.cost * multiplier * files.length;
  };

  const handleGenerate = async () => {
    if (files.length === 0) return;
    if (operation === "watermark" && !logoFile) {
        toast.error("Pilih file logo untuk watermark");
        return;
    }

    try {
      const params: Record<string, string | number> = {};
        if (operation === "product_scene") {
          params.theme = theme;
          params.aspect_ratio = aspectRatio;
          params.quality = modelQuality;
          params.composite_profile = compositeProfile;
      }

      if (operation === "watermark") {
        params.position = watermarkPosition;
        params.opacity = watermarkOpacity / 100;
        params.scale = watermarkScale / 100;
        params.visibility_preset = watermarkVisibilityPreset;
      }

      const uploadedItems = await Promise.all(
        files.map(async (file) => {
          const uploaded = await api.uploadImage(file);
          return {
            filename: file.name,
            image_url: uploaded.url,
          };
        })
      );

      if (operation === "watermark" && logoFile) {
        const uploadedLogo = await api.uploadImage(logoFile);
        params.logo_url = uploadedLogo.url;
      }

      await startToolJob({
        toolName: "batch",
        payload: {
          items: uploadedItems,
          operation,
          params,
        },
        quality: operation === "product_scene" ? modelQuality : "standard",
        idempotencyKey: `${operation}:${theme}:${aspectRatio}:${modelQuality}:${compositeProfile}:${watermarkPosition}:${watermarkOpacity}:${watermarkScale}:${watermarkVisibilityPreset}:${files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|")}:${logoFile ? `${logoFile.name}:${logoFile.size}:${logoFile.lastModified}` : ""}`,
        onCompleted: (job) => {
          if (!job.result_url) return;
          setResultUrl(job.result_url);
          const meta = (job.result_meta || {}) as {
            success_count?: number;
            error_count?: number;
            errors?: Array<{ filename: string; error: string }>;
            item_results?: Array<{ filename: string; result_url: string }>;
          };
          setBatchResult({
            success: meta.success_count ?? uploadedItems.length,
            error: meta.error_count ?? 0,
            errors: meta.errors ?? [],
            itemResults: (meta.item_results as Array<{filename: string, result_url: string}>) ?? [],
          });
          setStep(3);
          toast.success("Batch processing selesai");
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses batch gagal");
        },
        onCanceled: () => {
          toast.message("Proses batch dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status batch");
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
      onCanceled: () => toast.message("Proses batch dibatalkan"),
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
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 select-none">
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 1 ? 'bg-primary text-primary-foreground shadow-md' : step > 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">1</span>
            <span className="hidden sm:inline">Pilih File</span>
          </div>
          <div className={`w-4 sm:w-8 h-[2px] ${step > 1 ? 'bg-primary/40' : 'bg-border'}`}></div>
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 2 ? 'bg-primary text-primary-foreground shadow-md' : step > 2 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">2</span>
            <span className="hidden sm:inline">Konfigurasi</span>
          </div>
          <div className={`w-4 sm:w-8 h-[2px] ${step > 2 ? 'bg-primary/40' : 'bg-border'}`}></div>
          <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === 3 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">3</span>
            <span className="hidden sm:inline">Hasil</span>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" /> Batch Photo Processor
          </h1>
          <p className="text-muted-foreground mt-2">Upload banyak foto sekaligus \u2014 semua diproses otomatis. Hemat waktu berjam-jam.</p>
        </div>

        {step === 1 && (
          <BatchImageDropzone onFilesSelect={handleFilesSelect} maxFiles={10} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. File yang Dipilih ({files.length} foto)</h3>
              <div className="bg-muted/30 rounded-xl p-4 border max-h-[400px] overflow-y-auto space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-background border rounded-lg">
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-muted-foreground text-xs">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="w-full">Edit Pilihan File</Button>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">2. Pilihan Edit Massal</h3>
              
              <div className="space-y-3">
                {OPERATIONS.map(op => (
                  <label key={op.id} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${operation === op.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="operation" 
                      className="mt-1" 
                      checked={operation === op.id} 
                      onChange={() => handleOperationChange(op.id)} 
                    />
                    <div>
                      <div className="font-semibold">{op.name}</div>
                      <div className="text-sm text-muted-foreground">{op.desc}</div>
                      <div className="text-xs font-bold text-primary mt-1">{op.cost === 0 ? 'Gratis' : `${op.cost} Koin / foto`}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Extra Logic Configs depending on selected operation */}
              {operation === "product_scene" && (
                <div className="space-y-3 p-4 border rounded-xl bg-card">
                  <QualityToggle
                    value={modelQuality}
                    onChange={handleQualityChange}
                    standardCost={40}
                    className="mb-3"
                  />

                  <label className="text-sm font-medium block">Pilih Tema Background</label>
                  <div className="flex flex-wrap gap-2">
                    {THEMES.map(t => (
                        <div 
                          key={t.id} 
                          className={`px-3 py-1.5 border rounded-full text-sm cursor-pointer ${theme === t.id ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-muted/80'}`}
                          onClick={() => setTheme(t.id)}
                        >
                            {t.name}
                        </div>
                    ))}
                  </div>

                    <label className="text-sm font-medium block mt-2">Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map((ratio) => (
                        <div
                          key={ratio.id}
                          className={`px-3 py-1.5 border rounded-full text-sm cursor-pointer ${aspectRatio === ratio.id ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-muted/80'}`}
                          onClick={() => setAspectRatio(ratio.id)}
                        >
                          {ratio.name}
                        </div>
                      ))}
                    </div>

                    <label className="text-sm font-medium block mt-2">Blend Profile</label>
                    <div className="flex flex-wrap gap-2">
                      {COMPOSITE_PROFILES.map((profile) => (
                        <div
                          key={profile.id}
                          className={`px-3 py-1.5 border rounded-full text-sm cursor-pointer ${compositeProfile === profile.id ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-muted/80'}`}
                          onClick={() => setCompositeProfile(profile.id)}
                        >
                          {profile.name}
                        </div>
                      ))}
                    </div>
                </div>
              )}

              {operation === "watermark" && (
                <div className="space-y-3 p-4 border rounded-xl bg-card">
                  <label className="text-sm font-medium block">Upload Logo (PNG transparan disarankan)</label>
                  <input type="file" accept="image/png,image/jpeg" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  {logoFile && <p className="text-xs text-green-600 mt-1">Logo diupload: {logoFile.name}</p>}

                  <label className="text-sm font-medium block mt-2">Posisi Watermark</label>
                  <div className="flex flex-wrap gap-2">
                    {WATERMARK_POSITIONS.map((pos) => (
                      <div
                        key={pos.id}
                        className={`px-3 py-1.5 border rounded-full text-sm cursor-pointer ${watermarkPosition === pos.id ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-muted/80'}`}
                        onClick={() => setWatermarkPosition(pos.id)}
                      >
                        {pos.name}
                      </div>
                    ))}
                  </div>

                  <label className="text-sm font-medium block mt-2">Opacity: {watermarkOpacity}%</label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full"
                  />

                  <label className="text-sm font-medium block mt-2">Ukuran: {watermarkScale}%</label>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={watermarkScale}
                    onChange={(e) => setWatermarkScale(Number(e.target.value))}
                    className="w-full"
                  />

                  <label className="text-sm font-medium block mt-2">Kejelasan Watermark</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "subtle", name: "Subtle" },
                      { id: "balanced", name: "Balanced" },
                      { id: "protective", name: "Protective" },
                    ].map((preset) => (
                      <div
                        key={preset.id}
                        className={`px-3 py-1.5 border rounded-full text-sm cursor-pointer ${watermarkVisibilityPreset === preset.id ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-muted/80'}`}
                        onClick={() => setWatermarkVisibilityPreset(preset.id as VisibilityPreset)}
                      >
                        {preset.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-primary">Total Biaya:</span>
                  <span className="text-xl font-bold font-jakarta text-primary">{calculateTotalCost()} Koin</span>
              </div>

              <ToolProcessingState
                loading={loading}
                job={activeJob}
                defaultMessage="Memproses batch gambar"
                onCancel={handleCancel}
              />

              <Button 
                onClick={handleGenerate} 
                className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95 py-6 text-base" 
                size="lg" 
                disabled={loading}
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses Batch...</> : <><Layers className="w-5 h-5 mr-2" /> Proses {files.length} Foto</>}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Summary header */}
            <div className="flex items-center gap-4 p-5 rounded-2xl border bg-card shadow-sm">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">Proses Selesai!</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {batchResult.success} foto berhasil
                  {batchResult.error > 0 && `, ${batchResult.error} gagal`}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-4 h-4" /> Download ZIP
              </Button>
            </div>

            {/* Error list */}
            {batchResult.errors.length > 0 && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm max-h-40 overflow-y-auto">
                <p className="font-bold mb-2">File yang gagal:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {batchResult.errors.map((e, i) => (
                    <li key={i}>{e.filename}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-item gallery */}
            {batchResult.itemResults.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold">Hasil Per Foto</h4>
                  <div className="flex items-center gap-2">
                    {IMPORT_QUEUE_ENABLED && selectedItems.size > 0 && (
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={handoffLoading}
                        onClick={() => {
                          const queue: ImportQueueItem[] = Array.from(selectedItems).map(i => ({
                            url: batchResult.itemResults[i].result_url,
                            filename: batchResult.itemResults[i].filename,
                            sourceTool: "batch",
                          }));
                          posthog?.capture("batch_import_queue_continue_clicked", {
                            selected_count: queue.length,
                          });
                          openInEditor({
                            resultUrl: queue[0].url,
                            sourceTool: "batch",
                            title: queue[0].filename,
                            entryMode: "batch_import",
                            primaryAsset: { url: queue[0].url, filename: queue[0].filename },
                            importQueue: queue,
                          });
                        }}
                      >
                        {handoffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
                        Import ke Editor ({selectedItems.size})
                      </Button>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        if (selectedItems.size === batchResult.itemResults.length) {
                          setSelectedItems(new Set());
                          posthog?.capture("batch_result_selection_cleared");
                        } else {
                          setSelectedItems(new Set(batchResult.itemResults.map((_, i) => i)));
                          posthog?.capture("batch_result_selection_all", {
                            item_count: batchResult.itemResults.length,
                          });
                        }
                      }}
                    >
                      {selectedItems.size === batchResult.itemResults.length ? "Batal semua" : "Pilih semua"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {batchResult.itemResults.map((item, i) => (
                    <div
                      key={i}
                      className={`group relative rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedItems.has(i) ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedItems(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        posthog?.capture("batch_result_item_toggled", {
                          index: i,
                          selected: !prev.has(i),
                        });
                        return next;
                      })}
                    >
                      <div className="aspect-square relative bg-muted">
                        <Image src={item.result_url} alt={item.filename} fill className="object-cover" unoptimized />
                        {selectedItems.has(i) && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                            <SquareCheck className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                            title="Download"
                            onClick={(e) => { e.stopPropagation(); window.open(item.result_url, "_blank"); }}
                          >
                            <Download className="w-4 h-4 text-foreground" />
                          </button>
                          <button
                            className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                            title="Buka di Editor"
                            disabled={handoffLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              posthog?.capture("batch_result_item_opened_in_editor", { index: i, filename: item.filename });
                              openInEditor({ resultUrl: item.result_url, sourceTool: "batch", title: item.filename });
                            }}
                          >
                            <PenSquare className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate px-2 py-1.5">{item.filename}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Fallback when no per-item URLs (legacy jobs) */
              <div className="text-center p-8 border rounded-2xl bg-card">
                <p className="text-muted-foreground text-sm mb-4">Preview per-item tidak tersedia untuk job ini.</p>
                <Button size="lg" className="gap-2 font-bold" onClick={() => window.open(resultUrl, "_blank")}>
                  <Download className="w-5 h-5" /> Download Semua Hasil (ZIP)
                </Button>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => { setStep(1); setFiles([]); }}>
                Proses Foto Lainnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

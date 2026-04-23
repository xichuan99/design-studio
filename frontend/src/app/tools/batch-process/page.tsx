"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BatchImageDropzone } from "@/components/tools/BatchImageDropzone";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Layers, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";
import { QualityToggle } from "@/components/tools/QualityToggle";

const OPERATIONS = [
  { id: "remove_bg", name: "Hapus Latar Belakang", cost: 10, desc: "Hapus background foto produk secara otomatis" },
  { id: "product_scene", name: "AI Product Scene", cost: 40, desc: "Ganti dengan background studio/alam" },
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

export default function BatchProcessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [operation, setOperation] = useState("remove_bg");
  
  // Extra configs
  const [theme, setTheme] = useState("studio");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [compositeProfile, setCompositeProfile] = useState("grounded");
  const [modelQuality, setModelQuality] = useState<"standard" | "ultra">("standard");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [resultUrl, setResultUrl] = useState<string>("");
  const [batchResult, setBatchResult] = useState<{success: number, error: number, errors: Array<{filename: string, error: string}>}>({success: 0, error: 0, errors: []});
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();
  const api = useProjectApi();

  const handleFilesSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStep(2);
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
      const params: Record<string, string> = {};
        if (operation === "product_scene") {
          params.theme = theme;
          params.aspect_ratio = aspectRatio;
          params.quality = modelQuality;
          params.composite_profile = compositeProfile;
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
        idempotencyKey: `${operation}:${theme}:${aspectRatio}:${modelQuality}:${compositeProfile}:${files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|")}:${logoFile ? `${logoFile.name}:${logoFile.size}:${logoFile.lastModified}` : ""}`,
        onCompleted: (job) => {
          if (!job.result_url) return;
          setResultUrl(job.result_url);
          const meta = (job.result_meta || {}) as {
            success_count?: number;
            error_count?: number;
            errors?: Array<{ filename: string; error: string }>;
          };
          setBatchResult({
            success: meta.success_count ?? uploadedItems.length,
            error: meta.error_count ?? 0,
            errors: meta.errors ?? [],
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
            <span className="hidden sm:inline">Download ZIP</span>
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
                      onChange={() => setOperation(op.id)} 
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
                    onChange={setModelQuality}
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
          <div className="space-y-8 max-w-xl mx-auto text-center border p-12 rounded-2xl bg-card shadow-sm">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold">Proses Selesai!</h3>
            
            <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto p-4 bg-muted/50 rounded-xl my-6">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Sukses: {batchResult.success}</span>
                </div>
                <div className="flex items-center gap-2">
                    {batchResult.error > 0 ? <XCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    <span className="text-sm text-muted-foreground">Gagal: {batchResult.error}</span>
                </div>
            </div>

            {batchResult.errors.length > 0 && (
                <div className="text-left bg-destructive/10 text-destructive p-4 rounded-xl text-sm mb-6 max-h-40 overflow-y-auto">
                    <p className="font-bold mb-2">Beberapa file gagal diproses:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {batchResult.errors.map((e, i) => (
                            <li key={i}>{e.filename}: {e.error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-col gap-4 justify-center">
              <Button size="lg" className="gap-2 font-bold shadow-md w-full py-6 text-lg" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-6 h-6" /> Download Semua Hasil (ZIP)
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => { setStep(1); setFiles([]); }}>
                Proses Foto Lainnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

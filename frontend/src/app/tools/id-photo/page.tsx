"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Download, Camera, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";

export default function IdPhotoPage() {
  const router = useRouter();
  const api = useProjectApi();
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [bgColor, setBgColor] = useState("red");
  const [size, setSize] = useState("3x4");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [includePrintSheet, setIncludePrintSheet] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [printSheetUrl, setPrintSheetUrl] = useState<string | null>(null);
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    // Revoke previous object URL to prevent memory leak
    if (previewOriginal) URL.revokeObjectURL(previewOriginal);
    setPreviewOriginal(URL.createObjectURL(file));
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!originalFile) return;
    if (size === "custom" && (!customW || !customH)) {
      toast.error("Harap isi ukuran kustom (Lebar & Tinggi)");
      return;
    }

    try {
      const uploaded = await api.uploadImage(originalFile);
      await startToolJob({
        toolName: "id_photo",
        payload: {
          image_url: uploaded.url,
          bg_color: bgColor,
          size,
          custom_width_cm: customW ? Number(customW) : undefined,
          custom_height_cm: customH ? Number(customH) : undefined,
          output_format: outputFormat,
          include_print_sheet: includePrintSheet,
        },
        idempotencyKey: `${originalFile.name}:${originalFile.size}:${originalFile.lastModified}:${bgColor}:${size}:${customW}:${customH}:${outputFormat}:${includePrintSheet}`,
        onCompleted: (job) => {
          if (!job.result_url) return;
          setResultUrl(job.result_url);
          const meta = job.result_meta as { print_sheet_url?: string } | null | undefined;
          setPrintSheetUrl(meta?.print_sheet_url || null);
          setStep(3);
          toast.success("Pasfoto berhasil dibuat");
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses pasfoto gagal");
        },
        onCanceled: () => {
          toast.message("Proses pasfoto dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status pasfoto");
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
      onCanceled: () => toast.message("Proses pasfoto dibatalkan"),
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

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-500" />
            ID Photo (Pasfoto) Maker
          </h1>
          <p className="text-muted-foreground mt-2">Buat pasfoto resmi langsung dari foto selfie. Ukuran otomatis sesuai standar Indonesia.</p>
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Foto Original</h3>
              <div className="aspect-[3/4] bg-muted/50 rounded-xl overflow-hidden border border-border shadow-inner relative">
                <Image src={previewOriginal} alt="Original" fill className="object-contain p-2" unoptimized />
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">2. Pengaturan Pasfoto</h3>
              
              {/* Warn Background */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Warna Latar Belakang</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setBgColor("red")}
                    className={`cursor-pointer rounded-lg border-2 p-3 flex items-center gap-3 transition-all ${bgColor === "red" ? "border-red-500 bg-red-500/10" : "border-border hover:border-red-300"}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#CC0000] shadow-sm"></div>
                    <span className="font-medium text-sm">Merah Studio</span>
                  </div>
                  <div 
                    onClick={() => setBgColor("blue")}
                    className={`cursor-pointer rounded-lg border-2 p-3 flex items-center gap-3 transition-all ${bgColor === "blue" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-300"}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#0047AB] shadow-sm"></div>
                    <span className="font-medium text-sm">Biru Studio</span>
                  </div>
                </div>
              </div>

              {/* Ukuran */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Ukuran Pasfoto (cm)</label>
                <div className="grid grid-cols-4 gap-2">
                  {["2x3", "3x4", "4x6", "custom"].map(s => (
                    <Button 
                      key={s} 
                      variant={size === s ? "default" : "outline"}
                      className={`font-semibold ${size === s ? "shadow-md" : "text-muted-foreground"}`}
                      onClick={() => setSize(s)}
                    >
                      {s === "custom" ? "Kustom" : s}
                    </Button>
                  ))}
                </div>
              </div>

              {size === "custom" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Lebar (cm)</label>
                    <Input type="number" step="0.1" value={customW} onChange={e => setCustomW(e.target.value)} placeholder="Mis: 3.5" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tinggi (cm)</label>
                    <Input type="number" step="0.1" value={customH} onChange={e => setCustomH(e.target.value)} placeholder="Mis: 4.5" />
                  </div>
                </div>
              )}

              {/* Format & Cetak */}
              <div className="space-y-4 pt-2 border-t mt-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Format Output</label>
                  <select 
                      className="bg-transparent border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                      value={outputFormat} 
                      onChange={(e) => setOutputFormat(e.target.value as 'jpeg' | 'png')}
                  >
                      <option value="jpeg">JPEG (Ukuran Kecil)</option>
                      <option value="png">PNG (Kualitas Tinggi)</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-lg border border-border">
                  <input 
                    type="checkbox"
                    id="printSheet" 
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={includePrintSheet} 
                    onChange={(e) => setIncludePrintSheet(e.target.checked)} 
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="printSheet"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Kompilasi Lembar Cetak 4R
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Otomatis menyusun pasfoto ke dalam ukuran kertas 4R (10x15cm) siap cetak.
                    </p>
                  </div>
                </div>
              </div>

              <ToolProcessingState
                loading={loading}
                job={activeJob}
                defaultMessage="AI sedang memproses pasfoto"
                onCancel={handleCancel}
              />

              <Button 
                onClick={handleGenerate} 
                className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95 mt-4" 
                size="lg" 
                disabled={loading}
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Memproses GPU (30s)...</> : "Generate Pasfoto"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={`space-y-8 mx-auto ${printSheetUrl ? 'max-w-4xl' : 'max-w-md'}`}>
            <h3 className="text-xl font-bold text-center">Hasil Pasfoto (300 DPI)</h3>
            
            <div className={`grid gap-8 ${printSheetUrl ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-4">
                <h4 className="text-center font-medium text-muted-foreground">Foto Tunggal</h4>
                <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border bg-black relative max-w-sm mx-auto">
                   <Image src={resultUrl} alt="Result" fill className="object-contain" unoptimized />
                </div>
                <div className="flex flex-col gap-3">
                  <Button size="lg" className="gap-2 font-bold shadow-md w-full" onClick={() => window.open(resultUrl, "_blank")}>
                    <Download className="w-5 h-5" /> Download HD
                  </Button>
                  <Button size="lg" variant="secondary" className="gap-2 w-full" onClick={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}>
                    <PenSquare className="w-5 h-5" /> Lanjut ke Editor
                  </Button>
                </div>
              </div>

              {printSheetUrl && (
                <div className="space-y-4">
                  <h4 className="text-center font-medium text-muted-foreground">Lembar Cetak 4R (10x15cm)</h4>
                  <div className="aspect-[4/6] rounded-xl overflow-hidden shadow-2xl border bg-white relative max-w-sm mx-auto">
                     <Image src={printSheetUrl} alt="Print Sheet Result" fill className="object-contain" unoptimized />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button size="lg" className="gap-2 font-bold shadow-md w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(printSheetUrl, "_blank")}>
                      <Download className="w-5 h-5" /> Download Lembar 4R
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-6 border-t">
              <Button size="lg" variant="outline" className="w-full max-w-md" onClick={() => setStep(2)}>
                <span className="mr-2">♻️</span> Buat Pasfoto Baru
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

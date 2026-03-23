"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Upload, Download, ShieldCheck, Loader2 } from "lucide-react";
import Image from "next/image";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";

export default function WatermarkPlacerPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();
  
  // Settings
  const [position, setPosition] = useState<string>("bottom-right");
  const [opacity, setOpacity] = useState<number[]>([50]);
  const [scale, setScale] = useState<number[]>([20]);
  const api = useProjectApi();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File terlalu besar. Maksimal 10MB");
        return;
      }
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResultImage(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo terlalu besar. Maksimal 5MB");
        return;
      }
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setResultImage(null);
    }
  };

  const handleProcess = async () => {
    if (!imageFile || !logoFile) return;

    try {
      const [uploadedImage, uploadedLogo] = await Promise.all([
        api.uploadImage(imageFile),
        api.uploadImage(logoFile),
      ]);

      await startToolJob({
        toolName: "watermark",
        payload: {
          image_url: uploadedImage.url,
          logo_url: uploadedLogo.url,
          position,
          opacity: opacity[0] / 100,
          scale: scale[0] / 100,
        },
        idempotencyKey: `${imageFile.name}:${imageFile.size}:${imageFile.lastModified}:${logoFile.name}:${logoFile.size}:${logoFile.lastModified}:${position}:${opacity[0]}:${scale[0]}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultImage(job.result_url);
            toast.success("Watermark berhasil diterapkan");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses watermark gagal");
        },
        onCanceled: () => {
          toast.message("Proses watermark dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status watermark");
          }
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan pada server";
      toast.error(errorMessage);
    }
  };

  const handleCancel = async () => {
    await cancelActiveJob({
      onCanceled: () => toast.message("Proses watermark dibatalkan"),
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Gagal membatalkan proses");
        }
      },
    });
  };

  const handleDownload = () => {
    if (resultImage) {
      const a = document.createElement("a");
      a.href = resultImage;
      a.download = `watermark-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const positions = [
    { value: "top-left", label: "Kiri Atas" },
    { value: "top-right", label: "Kanan Atas" },
    { value: "bottom-left", label: "Kiri Bawah" },
    { value: "bottom-right", label: "Kanan Bawah" },
    { value: "center", label: "Tengah" },
    { value: "tiled", label: "Pattern (Penuh)" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-6xl mx-auto p-6 md:p-8 w-full gap-8 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-jakarta font-bold flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-orange-500" />
              AI Watermark Placer
            </h1>
            <p className="text-muted-foreground mt-2">
              Pasang logo toko Anda di foto produk supaya tidak dicuri kompetitor. Bisa atur posisi dan transparansi.
            </p>
          </div>

          <Card className="p-6 border-2 flex flex-col gap-6">
            {/* Step 1: Upload Files */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">1. Pilih Foto & Logo</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-dashed border-border/60 rounded-xl min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden bg-muted/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Foto Produk" fill className="object-contain p-2" />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <span className="text-xs text-muted-foreground font-medium">Foto Produk</span>
                    </div>
                  )}
                </div>

                <div className="border border-dashed border-border/60 rounded-xl min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden bg-muted/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {logoPreview ? (
                    <div className="absolute inset-0 p-4 flex items-center justify-center bg-checkered">
                        <div className="relative w-full h-full">
                            <Image src={logoPreview} alt="Logo" fill className="object-contain drop-shadow-sm" />
                        </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <span className="text-xs text-muted-foreground font-medium">Logo (PNG transparan)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Settings */}
            <div className={cn("space-y-6 transition-opacity", (!imageFile || !logoFile) && "opacity-50 pointer-events-none")}>
              <Label className="text-base font-semibold">2. Pengaturan Watermark</Label>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-sm">Posisi</Label>
                </div>
                <RadioGroup value={position} onValueChange={setPosition} className="grid grid-cols-2 gap-2">
                  {positions.map((pos) => (
                    <div key={pos.value}>
                      <RadioGroupItem value={pos.value} id={`pos-${pos.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`pos-${pos.value}`}
                        className="flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary hover:bg-muted font-medium text-xs transition-colors"
                      >
                        {pos.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-sm">Transparansi (Opacity)</Label>
                  <span className="text-xs font-mono text-muted-foreground">{opacity[0]}%</span>
                </div>
                <Slider min={10} max={100} step={5} value={opacity} onValueChange={setOpacity} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-sm">Ukuran Logo</Label>
                  <span className="text-xs font-mono text-muted-foreground">{scale[0]}%</span>
                </div>
                <Slider min={5} max={80} step={5} value={scale} onValueChange={setScale} />
              </div>

              <Button
                size="lg"
                className="w-full mt-4 font-bold tracking-wide"
                onClick={handleProcess}
                disabled={loading || !imageFile || !logoFile}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sedang Memproses...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" /> Pasang Watermark (Gratis)
                  </>
                )}
              </Button>

              <ToolProcessingState
                loading={loading}
                job={activeJob}
                defaultMessage="Menerapkan watermark"
                onCancel={handleCancel}
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex-1 bg-muted/30 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative shadow-sm min-h-[500px]">
            {resultImage && imagePreview ? (
              <div className="w-full h-full p-4">
                 <BeforeAfterSlider beforeImage={imagePreview} afterImage={resultImage} />
              </div>
            ) : imagePreview ? (
                <div className="relative w-full h-full p-4 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Original" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                     {logoPreview && (
                         <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">Klik &apos;Pasang Watermark&apos; untuk melihat hasil</span>
                         </div>
                     )}
                </div>
            ) : (
              <div className="text-center p-8 max-w-sm">
                <div className="bg-background w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border">
                  <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">Area Pratinjau</p>
                <p className="text-sm text-muted-foreground/70">
                  Upload foto dan logo Anda untuk melihat hasil penambahan watermark.
                </p>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                 <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
                 <p className="mt-4 font-medium text-lg animate-pulse">Menyusun Pixel...</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              variant="default"
              className={cn("gap-2 shadow-lg hover:shadow-xl transition-all font-bold", !resultImage && "opacity-50 pointer-events-none")}
              onClick={handleDownload}
              disabled={!resultImage || loading}
            >
              <Download className="w-5 h-5" /> Download Hasil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

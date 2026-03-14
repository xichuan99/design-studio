"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Download, PenSquare, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExpandDirection = "top" | "bottom" | "left" | "right";
type ResizeMode = "direction" | "dimensions";

export default function GenerativeExpandPage() {
  const router = useRouter();
  const api = useProjectApi();
  
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");
  
  // Original dimensions
  const [origWidth, setOrigWidth] = useState(1024);
  const [origHeight, setOrigHeight] = useState(1024);

  // Form state
  const [mode, setMode] = useState<ResizeMode>("direction");
  
  // Directional state
  const [direction, setDirection] = useState<ExpandDirection>("bottom");
  const [pixels, setPixels] = useState([256]);
  
  // Target dimensions state
  const [targetWidth, setTargetWidth] = useState(1080);
  const [targetHeight, setTargetHeight] = useState(1080);
  
  const [prompt, setPrompt] = useState("");

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    const url = URL.createObjectURL(file);
    setPreviewOriginal(url);
    
    // Get actual dimensions
    const img = new window.Image();
    img.onload = () => {
        setOrigWidth(img.naturalWidth);
        setOrigHeight(img.naturalHeight);
        setTargetWidth(Math.max(1080, img.naturalWidth));
        setTargetHeight(Math.max(1080, img.naturalHeight));
        setStep(2);
    };
    img.src = url;
  };

  const handleGenerate = async () => {
    if (!originalFile) return;
    
    setLoading(true);

    try {
      let data;
      
      if (mode === "direction") {
          data = await api.generativeExpand(
              originalFile, 
              direction, 
              pixels[0], 
              undefined, 
              undefined, 
              prompt
          );
      } else {
          // Verify target isn't smaller than original
          if (targetWidth < origWidth || targetHeight < origHeight) {
              throw new Error("Target dimensions must be greater than or equal to original dimensions for outpainting. Use crop instead for shrinking.");
          }
          data = await api.generativeExpand(
              originalFile,
              undefined,
              undefined,
              targetWidth,
              targetHeight,
              prompt
          );
      }
      
      setResultUrl(data.url);
      setStep(3);
      toast.success("Gambar berhasil diperluas!");
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const renderActivePreview = () => {
      if (mode === "direction") {
          return (
            <div className={`relative bg-muted rounded-xl p-8 border-2 border-dashed flex justify-center items-center ${
                direction === 'top' ? 'pt-24' :
                direction === 'bottom' ? 'pb-24' :
                direction === 'left' ? 'pl-24' :
                'pr-24'
            }`}>
                <div className={`absolute border-2 border-primary/50 bg-primary/10 border-dashed rounded-lg flex items-center justify-center font-medium text-primary/70 ${
                    direction === 'top' ? 'top-4 left-1/2 -translate-x-1/2 h-16 w-32' :
                    direction === 'bottom' ? 'bottom-4 left-1/2 -translate-x-1/2 h-16 w-32' :
                    direction === 'left' ? 'left-4 top-1/2 -translate-y-1/2 w-16 h-32' :
                    'right-4 top-1/2 -translate-y-1/2 w-16 h-32'
                }`}>
                    +{pixels[0]}px
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewOriginal} alt="Preview" className="max-h-64 object-contain shadow-md rounded border border-border/50" />
            </div>
          );
      } else {
          return (
            <div className="relative bg-muted rounded-xl p-8 border-2 border-dashed flex justify-center items-center h-[350px]">
                {/* Expanded container representation */}
                <div 
                    className="relative border-2 border-primary border-dashed bg-primary/5 rounded-lg flex items-center justify-center"
                    style={{
                        width: targetWidth >= targetHeight ? '200px' : `${(targetWidth/targetHeight) * 200}px`,
                        height: targetHeight > targetWidth ? '200px' : `${(targetHeight/targetWidth) * 200}px`,
                    }}
                >
                    <div className="absolute top-2 left-2 text-xs font-semibold text-primary/70">{targetWidth} x {targetHeight}</div>
                    
                    {/* Original image representation (centered) */}
                    <div 
                        className="bg-background border border-border shadow-sm flex items-center justify-center"
                        style={{
                            width: `${(origWidth/targetWidth) * 100}%`,
                            height: `${(origHeight/targetHeight) * 100}%`,
                        }}
                    >
                        <span className="text-[10px] text-muted-foreground">Original</span>
                    </div>
                </div>
            </div>
          );
      }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-8 w-full">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground transition-colors" 
          onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground">Generative Expand</h1>
          <p className="text-muted-foreground mt-2">
            Perluas foto atau ubah rasio kanvas dengan AI yang mengisi kekosongan secara natural.
            Cocok untuk menyesuaikan foto square (1:1) menjadi format Instagram Story (9:16).
          </p>
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-300">
            {/* Controls */}
            <div className="space-y-6 bg-card p-6 rounded-2xl border shadow-sm">
                
                <Tabs value={mode} onValueChange={(v) => setMode(v as ResizeMode)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="direction">Perluas Sisi</TabsTrigger>
                        <TabsTrigger value="dimensions">Ubah Ukuran (Ratio)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="direction" className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Pilih Arah Perluasan</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant={direction === "top" ? "default" : "outline"} 
                                    onClick={() => setDirection("top")}
                                    className="gap-2"
                                >
                                    <ChevronUp className="w-4 h-4" /> Atas
                                </Button>
                                <Button 
                                    variant={direction === "bottom" ? "default" : "outline"} 
                                    onClick={() => setDirection("bottom")}
                                    className="gap-2"
                                >
                                    <ChevronDown className="w-4 h-4" /> Bawah
                                </Button>
                                <Button 
                                    variant={direction === "left" ? "default" : "outline"} 
                                    onClick={() => setDirection("left")}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Kiri
                                </Button>
                                <Button 
                                    variant={direction === "right" ? "default" : "outline"} 
                                    onClick={() => setDirection("right")}
                                    className="gap-2"
                                >
                                    <ChevronRight className="w-4 h-4" /> Kanan
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex justify-between">
                                <Label className="text-base font-semibold">Berapa pixel?</Label>
                                <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm">{pixels[0]} px</span>
                            </div>
                            <Slider
                                value={pixels}
                                onValueChange={setPixels}
                                max={2048}
                                min={64}
                                step={32}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="dimensions" className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Dimensi Original</Label>
                            <div className="text-sm font-mono bg-muted/50 p-2 rounded border inline-block">
                                {origWidth} × {origHeight} px
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Maximize className="w-4 h-4 text-primary" />
                                Target Ukuran Akhir
                            </Label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase">Lebar (Width)</Label>
                                    <Input 
                                        type="number" 
                                        value={targetWidth} 
                                        onChange={(e) => setTargetWidth(parseInt(e.target.value) || 0)}
                                        min={origWidth}
                                    />
                                    {targetWidth < origWidth && <p className="text-[10px] text-red-500">Kecil dari original</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase">Tinggi (Height)</Label>
                                    <Input 
                                        type="number" 
                                        value={targetHeight} 
                                        onChange={(e) => setTargetHeight(parseInt(e.target.value) || 0)}
                                        min={origHeight}
                                    />
                                    {targetHeight < origHeight && <p className="text-[10px] text-red-500">Kecil dari original</p>}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-2">
                                {[
                                    { label: 'IG Post (1080x1080)', w: 1080, h: 1080 },
                                    { label: 'IG Story (1080x1920)', w: 1080, h: 1920 },
                                    { label: 'Landscape (1920x1080)', w: 1920, h: 1080 }
                                ].map((preset) => (
                                    <Button 
                                        key={preset.label} 
                                        variant="outline" 
                                        size="sm"
                                        className="text-xs h-7 rounded-full"
                                        onClick={() => {
                                            setTargetWidth(Math.max(origWidth, preset.w));
                                            setTargetHeight(Math.max(origHeight, preset.h));
                                        }}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">Tuntunan Objek (Opsional)</Label>
                    <Input 
                        placeholder="Contoh: pemandangan gunung di kejauhan, meja kayu..." 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Ketik ini jika ingin AI menggambar sesuatu yang spesifik di area yang kosong.</p>
                </div>

                <Button 
                    size="lg" 
                    className="w-full font-bold h-12 mt-6" 
                    onClick={handleGenerate}
                    disabled={loading || (mode === "dimensions" && (targetWidth < origWidth || targetHeight < origHeight))}
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Memperluas Gambar...</>
                    ) : (
                        "🚀 Generate Expand"
                    )}
                </Button>
            </div>

            {/* Preview visualization */}
            <div className="space-y-4">
                <h3 className="font-semibold px-2">Visualisasi</h3>
                {renderActivePreview()}
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                    <strong>Catatan:</strong> Generative Expand akan menambah ruang pada gambar. Jika gambar asli terlalu besar (&gt; 2048px), sistem mungkin akan me-resize otomatis agar output optimal.
                </div>
            </div>

          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <h3 className="text-xl font-bold text-center">Hasil Generative Expand</h3>
            
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

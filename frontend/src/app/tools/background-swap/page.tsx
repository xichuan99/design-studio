"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BeforeAfterSlider } from "@/components/tools/BeforeAfterSlider";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Download, PenSquare, Sparkles, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useProjectApi } from "@/lib/api";
import { useToolJobProgress } from "@/hooks/useToolJobProgress";

type Suggestion = { title: string; emoji: string; prompt: string };

export default function BackgroundSwapPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const { loading, activeJob, startToolJob, cancelActiveJob } = useToolJobProgress();

  // Suggestion mode state
  const [promptMode, setPromptMode] = useState<"suggest" | "custom">("suggest");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const api = useProjectApi();

  const handleFileSelect = (file: File) => {
    setOriginalFile(file);
    setPreviewOriginal(URL.createObjectURL(file));
    setSuggestions([]);
    setSelectedSuggestion(null);
    setPrompt("");
    setStep(2);
  };

  const handleAnalyze = async () => {
    if (!originalFile) return;
    setSuggestLoading(true);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setPrompt("");

    try {
      const data = await api.suggestBackgrounds(originalFile);
      setSuggestions(data.suggestions || []);
      if (data.suggestions?.length === 0) {
        toast.warning("Tidak ada saran yang dihasilkan. Coba mode Tulis Sendiri.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Gagal menganalisis gambar");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSelectSuggestion = (index: number) => {
    setSelectedSuggestion(index);
    setPrompt(suggestions[index].prompt);
  };

  const handleGenerate = async () => {
    if (!originalFile || !prompt) return;

    try {
      const uploaded = await api.uploadImage(originalFile);
      await startToolJob({
        toolName: "background_swap",
        payload: {
          image_url: uploaded.url,
          prompt,
        },
        idempotencyKey: `${originalFile.name}:${originalFile.size}:${originalFile.lastModified}:${prompt}`,
        onCompleted: (job) => {
          if (job.result_url) {
            setResultUrl(job.result_url);
            setStep(3);
            toast.success("Background swap selesai");
          }
        },
        onFailed: (job) => {
          toast.error(job.error_message || "Proses background swap gagal");
        },
        onCanceled: () => {
          toast.message("Proses background swap dibatalkan");
        },
        onError: (error) => {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("Gagal memantau status background swap");
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
      onCanceled: () => toast.message("Proses background swap dibatalkan"),
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
        <Button
          variant="ghost"
          className="mb-6 -ml-4 gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => step > 1 && step < 3 ? setStep(1) : router.push("/tools")}
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 select-none">
          {[
            { label: "Upload Foto", n: 1 },
            { label: "Atur Suasana", n: 2 },
            { label: "Hasil", n: 3 },
          ].map(({ label, n }, i, arr) => (
            <div key={n} className="flex items-center gap-1 sm:gap-2">
              <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${step === n ? "bg-primary text-primary-foreground shadow-md" : step > n ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-background/20 font-bold">{n}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-4 sm:w-8 h-[2px] ${step > n ? "bg-primary/40" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-jakarta font-bold text-foreground">AI Background Swap</h1>
          <p className="text-muted-foreground mt-2">Foto produk pakai HP? Ganti backgroundnya jadi studio profesional dalam satu klik.</p>
        </div>

        {step === 1 && (
          <ImageDropzone onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Gambar Original (Preview)</h3>
              <div className="flex items-center justify-center p-4 bg-muted/20 border rounded-xl min-h-[300px]">
                <div className="bg-muted/50 rounded-xl overflow-hidden border border-border shadow-inner relative w-full aspect-square max-w-[400px]">
                  <Image src={previewOriginal} alt="Original" fill className="object-contain p-2" unoptimized />
                </div>
              </div>
            </div>

            {/* Right: Settings */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">2. Tentukan Suasana Baru</h3>

              {/* Mode Tabs */}
              <div className="bg-muted/50 p-1.5 rounded-lg flex gap-1 border">
                <button
                  onClick={() => setPromptMode("suggest")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all ${promptMode === "suggest" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Sparkles className="w-4 h-4" />
                  Saran AI
                </button>
                <button
                  onClick={() => setPromptMode("custom")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-all ${promptMode === "custom" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <PencilLine className="w-4 h-4" />
                  Tulis Sendiri
                </button>
              </div>

              {/* ── Mode: Saran AI ── */}
              {promptMode === "suggest" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Klik tombol di bawah — AI akan memindai gambar dan memberikan 3 rekomendasi background yang cantik untuk produkmu.
                  </p>

                  <Button
                    variant="outline"
                    className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                    onClick={handleAnalyze}
                    disabled={suggestLoading}
                  >
                    {suggestLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis gambar...</>
                      : <><Sparkles className="w-4 h-4" /> ✨ Analisis Gambar (5 kredit)</>
                    }
                  </Button>

                  {/* Skeleton Cards */}
                  {suggestLoading && (
                    <div className="grid grid-cols-1 gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 rounded-xl border bg-muted/30 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {/* Suggestion Cards */}
                  {!suggestLoading && suggestions.length > 0 && (
                    <div className="grid grid-cols-1 gap-3">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectSuggestion(i)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 ${selectedSuggestion === i ? "border-primary bg-primary/10 shadow-md" : "border-border bg-card"}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl leading-none mt-0.5">{s.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm">{s.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.prompt}</p>
                            </div>
                            {selectedSuggestion === i && (
                              <span className="text-primary text-xs font-bold shrink-0 mt-0.5">✓ Dipilih</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hint to switch mode */}
                  {!suggestLoading && suggestions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Punya ide sendiri?{" "}
                      <button className="text-primary underline" onClick={() => setPromptMode("custom")}>
                        Tulis sendiri
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* ── Mode: Custom ── */}
              {promptMode === "custom" && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Deskripsikan latar belakang (Prompt)</label>
                  <Input
                    placeholder="Contoh: di atas meja kayu dengan pencahayaan studio hangat, kabut tipis, bokeh..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-card shadow-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingin inspirasi?{" "}
                    <button className="text-primary underline" onClick={() => setPromptMode("suggest")}>
                      Pakai Saran AI
                    </button>
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                className="w-full font-bold shadow-md hover:shadow-lg transition-transform active:scale-95"
                size="lg"
                disabled={!prompt || loading}
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {activeJob?.phase_message || "Sedang Memproses AI..."}</>
                  : "✨ Generate AI Background"
                }
              </Button>

              <ToolProcessingState
                loading={loading}
                job={activeJob}
                defaultMessage="Sedang Memproses AI..."
                onCancel={handleCancel}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center">Hasil Akhir</h3>
            <BeforeAfterSlider beforeImage={previewOriginal} afterImage={resultUrl} className="shadow-2xl ring-1 ring-border" />

            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="outline" onClick={() => setStep(2)}>
                <span className="mr-2">♻️</span> Generate Ulang
              </Button>
              <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="w-5 h-5" /> Download HD
              </Button>
              <Button size="lg" variant="secondary" className="gap-2" onClick={() => router.push(`/create?imageUrl=${encodeURIComponent(resultUrl)}`)}>
                <PenSquare className="w-5 h-5" /> Lanjut ke Editor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

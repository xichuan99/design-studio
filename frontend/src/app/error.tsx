"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Global error caught:", error);
  }, [error]);

  const isSkewError = 
    error.message?.includes("Failed to find Server Action") ||
    error.message?.includes("NEXT_ROUTER_PREFETCH") ||
    error.digest?.includes("NEXT_NOT_FOUND");

  useEffect(() => {
    if (isSkewError) {
      console.warn("Auto-reloading due to deployment skew...");
      window.location.reload();
    }
  }, [isSkewError]);

  // If version mismatch is detected, show a clean, transition UI
  // rather than a frightening error screen.
  if (isSkewError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <RefreshCcw className="w-12 h-12 text-primary animate-spin relative z-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Sinkronisasi Aplikasi</h2>
            <p className="text-muted-foreground max-w-[250px]">
              Sedang memuat versi terbaru untuk menjaga data Anda tetap sinkron...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="bg-muted min-w-[300px] max-w-md p-8 pt-10 rounded-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
          Terjadi Kesalahan
        </h2>
        <p className="text-muted-foreground mb-8">
          Maaf, ada sesuatu yang salah. Kami sedang berusaha memperbaikinya.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="flex gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Muat Ulang
          </Button>
          <Button onClick={() => reset()} variant="outline">
            Coba Lagi
          </Button>
        </div>
      </div>
    </div>
  );
}

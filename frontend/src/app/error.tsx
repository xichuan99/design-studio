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

    // Auto-recovery for Server Action mismatch errors after deployments
    if (
      error.message?.includes("Failed to find Server Action") ||
      error.message?.includes("NEXT_ROUTER_PREFETCH")
    ) {
      console.log("Detected older deployment version mismatch. Auto-reloading...");
      // Hard refresh to get the latest JS bundle
      window.location.reload();
    }
  }, [error]);

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

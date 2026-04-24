"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiToolJob } from "@/lib/api";

interface ToolProcessingStateProps {
  loading: boolean;
  job: AiToolJob | null;
  defaultMessage?: string;
  description?: string;
  nextStepHint?: string;
  onCancel?: () => void;
  variant?: "card" | "centered";
}

export function ToolProcessingState({
  loading,
  job,
  defaultMessage = "AI sedang memproses",
  description,
  nextStepHint = "Setelah selesai, Anda bisa meninjau hasil lalu lanjutkan ke editor atau simpan hasilnya.",
  onCancel,
  variant = "card",
}: ToolProcessingStateProps) {
  if (!loading) return null;

  const phaseMessage = job?.phase_message || defaultMessage;
  const progressPercent = job?.progress_percent ?? 0;

  if (variant === "centered") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="AI sedang memproses"
        className="flex flex-col items-center justify-center py-24 text-center space-y-4"
      >
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <h3 className="text-xl font-semibold">{phaseMessage}</h3>
        {description && <p className="text-muted-foreground max-w-md">{description}</p>}
        {job && (
          <>
            <div className="w-full max-w-md h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{progressPercent}%</p>
          </>
        )}
        <p className="max-w-md text-sm text-muted-foreground/80">{nextStepHint}</p>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Batalkan Proses
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Status pemrosesan AI"
      className="rounded-xl border bg-muted/40 p-4 space-y-3"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Status Proses</span>
        <span className="text-muted-foreground">{progressPercent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{phaseMessage}</p>
      <p className="text-xs leading-relaxed text-muted-foreground/80">{nextStepHint}</p>
      {onCancel && (
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Batalkan Proses
        </Button>
      )}
    </div>
  );
}

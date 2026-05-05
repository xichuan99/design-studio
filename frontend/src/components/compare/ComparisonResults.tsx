"use client";

import Image from "next/image";

import type { ComparisonSessionResponse } from "@/lib/api";

interface ComparisonResultsProps {
  session: ComparisonSessionResponse;
  readOnly?: boolean;
  onShare?: () => void;
}

export function ComparisonResults({ session, readOnly = false, onShare }: ComparisonResultsProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Comparison Session</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Bandingkan model untuk brief yang sama</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{session.raw_text}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Status: <strong className="text-foreground">{session.status}</strong></span>
            <span>Total kredit: <strong className="text-foreground">{session.charged_credits}</strong></span>
            {!readOnly && onShare && (
              <button
                type="button"
                onClick={onShare}
                className="rounded-lg border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Bagikan hasil
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {session.variants.map((variant) => (
          <div key={variant.tier} className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{variant.tier.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Perkiraan biaya {variant.estimated_cost} kredit</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {variant.status}
                </span>
              </div>
            </div>
            <div className="p-4">
              {variant.result_url ? (
                <div className="overflow-hidden rounded-xl border bg-muted/20">
                  <div className="relative aspect-square w-full">
                    <Image src={variant.result_url} alt={`Comparison result ${variant.tier}`} fill className="object-cover" unoptimized />
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  {variant.status === "failed"
                    ? variant.error_message || "Varian ini gagal diproses."
                    : "Variant sedang diproses. Halaman ini akan ter-update saat polling berikutnya."}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
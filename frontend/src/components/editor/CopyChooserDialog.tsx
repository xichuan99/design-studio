"use client";

import { Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CopywritingVariation } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";

interface CopyChooserDialogProps {
  open: boolean;
  variations: CopywritingVariation[];
  canvasWidth: number;
  canvasHeight: number;
  onClose: () => void;
}

export function CopyChooserDialog({
  open,
  variations,
  canvasWidth,
  canvasHeight,
  onClose,
}: CopyChooserDialogProps) {
  const { addMagicTextElements } = useCanvasStore();

  const handlePick = (v: CopywritingVariation) => {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    const elements = [
      v.headline && {
        type: "text" as const,
        x: cx - 200,
        y: cy - 120,
        width: 400,
        text: v.headline,
        fontSize: 54,
        fontFamily: "Inter",
        fontWeight: "bold" as const,
        fill: "#0f172a",
        align: "center",
        rotation: 0,
        label: "Magic Text headline",
      },
      v.subline && {
        type: "text" as const,
        x: cx - 200,
        y: cy - 40,
        width: 400,
        text: v.subline,
        fontSize: 24,
        fontFamily: "Inter",
        fontWeight: "normal" as const,
        fill: "#0f172a",
        align: "center",
        rotation: 0,
        label: "Magic Text subline",
      },
      v.cta && {
        type: "text" as const,
        x: cx - 100,
        y: cy + 60,
        width: 200,
        text: v.cta,
        fontSize: 18,
        fontFamily: "Inter",
        fontWeight: "bold" as const,
        fill: "#ffffff",
        backgroundColor: "#0f172a",
        padding: 12,
        cornerRadius: 8,
        align: "center",
        rotation: 0,
        label: "Magic Text cta",
      },
    ].filter(Boolean) as Parameters<typeof addMagicTextElements>[0];

    addMagicTextElements(elements);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Pilih Teks Promosi AI
          </DialogTitle>
          <DialogDescription>
            AI menyiapkan beberapa variasi teks untuk desain ini. Pilih satu untuk langsung ditambahkan ke kanvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-2">
          {variations.map((v, i) => (
            <button
              key={i}
              className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/60 hover:bg-primary/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => handlePick(v)}
            >
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-muted text-muted-foreground mb-3">
                <Wand2 className="w-2.5 h-2.5" />
                {v.style}
              </span>
              <p className="font-bold text-base text-foreground leading-snug">{v.headline}</p>
              {v.subline && (
                <p className="text-sm text-muted-foreground mt-1">{v.subline}</p>
              )}
              {v.cta && (
                <span className="inline-block mt-2 px-3 py-1 text-xs font-bold bg-foreground text-background rounded-lg">
                  {v.cta}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t mt-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={onClose}>
            <X className="w-4 h-4" /> Lewati
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

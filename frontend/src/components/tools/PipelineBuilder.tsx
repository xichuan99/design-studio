import type { ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToolProcessingState } from "@/components/tools/ToolProcessingState";
import type { AiToolJob } from "@/lib/api";

export type StageId = "remove_bg" | "inpaint_bg" | "generate_bg" | "watermark";

const STAGE_LABELS: Record<StageId, string> = {
  remove_bg: "Remove Background",
  inpaint_bg: "Inpaint Background",
  generate_bg: "Generate Background",
  watermark: "Apply Watermark",
};

interface PipelineBuilderProps {
  stageOrder: StageId[];
  enableRemoveBg: boolean;
  enableInpaintBg: boolean;
  enableGenerateBg: boolean;
  enableWatermark: boolean;
  inpaintPrompt: string;
  generatePrompt: string;
  watermarkPosition: string;
  watermarkOpacity: string;
  watermarkScale: string;
  loading: boolean;
  previewLoading: boolean;
  activeJob: AiToolJob | null;
  hasOriginalFile: boolean;
  activeStageCount: number;
  onApplyPreset: (preset: "quick_cutout" | "studio_rebuild" | "branded_ready") => void;
  onMoveStage: (index: number, direction: -1 | 1) => void;
  onSetEnabled: (stageId: StageId, enabled: boolean) => void;
  onSetEnableRemoveBg: (enabled: boolean) => void;
  onSetEnableInpaintBg: (enabled: boolean) => void;
  onSetEnableGenerateBg: (enabled: boolean) => void;
  onSetEnableWatermark: (enabled: boolean) => void;
  onSetInpaintPrompt: (value: string) => void;
  onSetGeneratePrompt: (value: string) => void;
  onSetWatermarkPosition: (value: string) => void;
  onSetWatermarkOpacity: (value: string) => void;
  onSetWatermarkScale: (value: string) => void;
  onWatermarkFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRunPipeline: () => void;
  onRunPreview: () => void;
  onCancel: () => void;
  watermarkPositions: readonly string[];
}

export function PipelineBuilder({
  stageOrder,
  enableRemoveBg,
  enableInpaintBg,
  enableGenerateBg,
  enableWatermark,
  inpaintPrompt,
  generatePrompt,
  watermarkPosition,
  watermarkOpacity,
  watermarkScale,
  loading,
  previewLoading,
  activeJob,
  hasOriginalFile,
  activeStageCount,
  onApplyPreset,
  onMoveStage,
  onSetEnabled,
  onSetEnableRemoveBg,
  onSetEnableInpaintBg,
  onSetEnableGenerateBg,
  onSetEnableWatermark,
  onSetInpaintPrompt,
  onSetGeneratePrompt,
  onSetWatermarkPosition,
  onSetWatermarkOpacity,
  onSetWatermarkScale,
  onWatermarkFileChange,
  onRunPipeline,
  onRunPreview,
  onCancel,
  watermarkPositions,
}: PipelineBuilderProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Pipeline Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Stage Toggles ── */}
        <fieldset className="space-y-2" aria-label="Stage configuration">
          <legend className="sr-only">Stage configuration</legend>

          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 min-h-[44px]">
            <Label htmlFor="remove-bg-switch" className="font-medium cursor-pointer">1. Remove Background</Label>
            <Switch id="remove-bg-switch" checked={enableRemoveBg} onCheckedChange={onSetEnableRemoveBg} aria-label="Toggle Remove Background stage" />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between min-h-[44px]">
              <Label htmlFor="inpaint-switch" className="font-medium cursor-pointer">2. Inpaint Background</Label>
              <Switch id="inpaint-switch" checked={enableInpaintBg} onCheckedChange={onSetEnableInpaintBg} aria-label="Toggle Inpaint Background stage" />
            </div>
            {enableInpaintBg && (
              <Input
                aria-label="Inpaint background prompt"
                placeholder="Contoh: soft cafe background with warm light"
                value={inpaintPrompt}
                onChange={(event) => onSetInpaintPrompt(event.target.value)}
              />
            )}
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between min-h-[44px]">
              <Label htmlFor="generate-switch" className="font-medium cursor-pointer">3. Generate Background</Label>
              <Switch id="generate-switch" checked={enableGenerateBg} onCheckedChange={onSetEnableGenerateBg} aria-label="Toggle Generate Background stage" />
            </div>
            {enableGenerateBg && (
              <Input
                aria-label="Generate background prompt"
                placeholder="Contoh: clean studio backdrop, premium look"
                value={generatePrompt}
                onChange={(event) => onSetGeneratePrompt(event.target.value)}
              />
            )}
          </div>
        </fieldset>

        {/* ── Presets ── */}
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-semibold text-foreground">Preset Pipeline</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => onApplyPreset("quick_cutout")}>Quick Cutout</Button>
            <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => onApplyPreset("studio_rebuild")}>Studio Rebuild</Button>
            <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => onApplyPreset("branded_ready")}>Branded Ready</Button>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="watermark-switch" className="font-medium">4. Apply Watermark</Label>
            <Switch id="watermark-switch" checked={enableWatermark} onCheckedChange={onSetEnableWatermark} />
          </div>
          {enableWatermark && (
            <>
              <div className="space-y-2">
                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="font-medium">Urutan Stage</Label>
                  <div className="space-y-2">
                    {stageOrder.map((stageId, index) => {
                      const enabled =
                        (stageId === "remove_bg" && enableRemoveBg) ||
                        (stageId === "inpaint_bg" && enableInpaintBg) ||
                        (stageId === "generate_bg" && enableGenerateBg) ||
                        (stageId === "watermark" && enableWatermark);

                      return (
                        <div key={stageId} className="rounded-md border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                              <span className="text-sm font-medium">{STAGE_LABELS[stageId]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={enabled} onCheckedChange={(next) => onSetEnabled(stageId, next)} />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                disabled={index === 0}
                                aria-label={`Move ${STAGE_LABELS[stageId]} up`}
                                onClick={() => onMoveStage(index, -1)}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                disabled={index === stageOrder.length - 1}
                                aria-label={`Move ${STAGE_LABELS[stageId]} down`}
                                onClick={() => onMoveStage(index, 1)}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Label htmlFor="watermark-file">Logo</Label>
                <Input id="watermark-file" type="file" accept="image/*" onChange={onWatermarkFileChange} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={watermarkPosition}
                  onChange={(event) => onSetWatermarkPosition(event.target.value)}
                >
                  {watermarkPositions.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
                <Input
                  value={watermarkOpacity}
                  onChange={(event) => onSetWatermarkOpacity(event.target.value)}
                  placeholder="opacity 0.0-1.0"
                />
                <Input
                  value={watermarkScale}
                  onChange={(event) => onSetWatermarkScale(event.target.value)}
                  placeholder="scale 0.05-1"
                />
              </div>
            </>
          )}
        </div>

        <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
          Total stage aktif: <span className="font-semibold text-foreground">{activeStageCount}</span>
        </div>

        <ToolProcessingState
          loading={loading}
          job={activeJob}
          defaultMessage="AI sedang menjalankan pipeline"
          onCancel={onCancel}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            className="w-full"
            size="lg"
            variant="outline"
            onClick={onRunPreview}
            disabled={loading || previewLoading || !hasOriginalFile}
          >
            {previewLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preview...</> : "Preview Cepat"}
          </Button>
          <Button className="w-full" size="lg" onClick={onRunPipeline} disabled={loading || previewLoading || !hasOriginalFile}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : "Jalankan Pipeline"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

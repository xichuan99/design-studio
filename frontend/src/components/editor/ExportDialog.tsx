"use client";

import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { Download, Loader2, Layers, ThumbsDown, ThumbsUp } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/events";
import { useApiCore } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    projectId?: string;
    jobId?: string;
    onAutoResizeClick?: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onOpenChange, title, projectId, jobId, onAutoResizeClick }) => {
    const { stageRef } = useCanvasStore();
    const posthog = usePostHog();
    const { API_BASE_URL, getHeaders } = useApiCore();
    const [format, setFormat] = useState<"png" | "jpeg" | "pdf">("png");
    const [isExporting, setIsExporting] = useState(false);
    const [exportCompleted, setExportCompleted] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
    const [feedbackHelpful, setFeedbackHelpful] = useState<boolean | null>(null);
    const [feedbackNote, setFeedbackNote] = useState("");
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setExportCompleted(false);
            setFeedbackRating(null);
            setFeedbackHelpful(null);
            setFeedbackNote("");
            setFeedbackSubmitted(false);
        }
        onOpenChange(nextOpen);
    };

    const handleExport = async () => {
        if (!stageRef) return;

        setIsExporting(true);
        try {
            // De-select any selected element before exporting
            useCanvasStore.getState().selectElement(null);

            // Give React a small tick to update the DOM (hide transformer)
            await new Promise((r) => setTimeout(r, 100));

            const stage = stageRef;

            // Adaptive pixel ratio: limit to max 4096px on longest side
            const maxDim = Math.max(stage.width(), stage.height());
            const adaptiveRatio = maxDim > 0 && maxDim * 2 > 4096 ? Math.floor(4096 / maxDim) : 2;

            // Temporarily set pixel ratio for higher quality export
            const dataUrl = stage.toDataURL({
                pixelRatio: adaptiveRatio,
                mimeType: `image/${format === "pdf" ? "jpeg" : format}`,
                quality: 0.92
            });

            const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_export`;

            if (format === "pdf") {
                // PDF Export using jsPDF
                // Calculate aspect ratio
                const stageWidth = stage.width();
                const stageHeight = stage.height();
                // create pdf with same dimensions (using pt units)
                const pdf = new jsPDF({
                    orientation: stageWidth > stageHeight ? "l" : "p",
                    unit: "px",
                    format: [stageWidth, stageHeight]
                });

                pdf.addImage(dataUrl, "JPEG", 0, 0, stageWidth, stageHeight);
                pdf.save(`${filename}.pdf`);
            } else {
                // Image Export (PNG/JPG)
                const link = document.createElement("a");
                link.download = `${filename}.${format}`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            setExportCompleted(true);
            if (localStorage.getItem("smartdesign_first_export_v1") !== "1") {
                trackEvent(posthog, "first_export", {
                    source: "editor",
                    format,
                    canvas_width: stage.width(),
                    canvas_height: stage.height(),
                });
                localStorage.setItem("smartdesign_first_export_v1", "1");
            }
        } catch (err) {
            console.error("Export failed:", err);
            toast.error("Gagal mengekspor desain.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!feedbackRating) {
            toast.error("Pilih rating dulu.");
            return;
        }

        setFeedbackSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/designs/export-feedback`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    design_id: projectId,
                    job_id: jobId,
                    rating: feedbackRating,
                    helpful: feedbackHelpful,
                    note: feedbackNote,
                    export_format: format,
                    source: "export",
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit export feedback");
            }

            trackEvent(posthog, "feedback_submitted", {
                source: "export",
                rating: feedbackRating,
                design_id: projectId,
                job_id: jobId,
                helpful: feedbackHelpful ?? undefined,
            });
            setFeedbackSubmitted(true);
            toast.success("Terima kasih, feedback tersimpan.");
        } catch (err) {
            console.error("Failed to submit export feedback:", err);
            toast.error("Feedback belum tersimpan.");
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ekspor Desain</DialogTitle>
                    <DialogDescription>
                        Pilih format untuk mengunduh desain Kamu.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <RadioGroup defaultValue="png" onValueChange={(val: string) => setFormat(val as "png" | "jpeg" | "pdf")}>
                        <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors">
                            <RadioGroupItem value="png" id="r-png" />
                            <Label htmlFor="r-png" className="flex-1 cursor-pointer text-foreground">PNG (Gambar Kualitas Tinggi)</Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors">
                            <RadioGroupItem value="jpeg" id="r-jpg" />
                            <Label htmlFor="r-jpg" className="flex-1 cursor-pointer text-foreground">JPG (Ukuran File Lebih Kecil)</Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors">
                            <RadioGroupItem value="pdf" id="r-pdf" />
                            <Label htmlFor="r-pdf" className="flex-1 cursor-pointer text-foreground">PDF (Format Dokumen)</Label>
                        </div>
                    </RadioGroup>

                    {exportCompleted && (
                        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-sm font-medium">Hasil ini membantu?</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={feedbackHelpful === true ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setFeedbackHelpful(true)}
                                        title="Membantu"
                                    >
                                        <ThumbsUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={feedbackHelpful === false ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setFeedbackHelpful(false)}
                                        title="Kurang membantu"
                                    >
                                        <ThumbsDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <Button
                                        key={rating}
                                        type="button"
                                        variant={feedbackRating === rating ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setFeedbackRating(rating)}
                                    >
                                        {rating}
                                    </Button>
                                ))}
                            </div>
                            <Textarea
                                value={feedbackNote}
                                onChange={(event) => setFeedbackNote(event.target.value)}
                                maxLength={1000}
                                placeholder="Catatan singkat"
                                className="min-h-20 text-sm"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handleSubmitFeedback}
                                disabled={feedbackSubmitting || feedbackSubmitted}
                                className="w-full"
                            >
                                {feedbackSubmitting ? "Menyimpan..." : feedbackSubmitted ? "Feedback tersimpan" : "Kirim feedback"}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button disabled={isExporting} onClick={handleExport} className="w-full sm:w-auto">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? "Mengekspor..." : "Unduh"}
                    </Button>
                </div>
                {onAutoResizeClick && (
                    <div className="pt-4 border-t mt-2 flex flex-col items-center gap-3">
                        <p className="text-sm text-muted-foreground text-center">
                            Butuh versi Shopee, Tokopedia, Instagram, dan WhatsApp sekaligus?
                        </p>
                        <Button 
                            variant="secondary" 
                            className="w-full font-medium"
                            onClick={onAutoResizeClick}
                        >
                            <Layers className="mr-2 w-4 h-4" />
                            Auto-Resize Multi-Channel
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

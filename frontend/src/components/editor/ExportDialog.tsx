"use client";

import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { Download, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onOpenChange, title }) => {
    const { stageRef } = useCanvasStore();
    const [format, setFormat] = useState<"png" | "jpeg" | "pdf">("png");
    const [isExporting, setIsExporting] = useState(false);

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

            onOpenChange(false);
        } catch (err) {
            console.error("Export failed:", err);
            toast.error("Gagal mengekspor desain.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Design</DialogTitle>
                    <DialogDescription>
                        Choose the format to download your design.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <RadioGroup defaultValue="png" onValueChange={(val: string) => setFormat(val as "png" | "jpeg" | "pdf")}>
                        <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors">
                            <RadioGroupItem value="png" id="r-png" />
                            <Label htmlFor="r-png" className="flex-1 cursor-pointer text-foreground">PNG (High Quality Image)</Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors">
                            <RadioGroupItem value="jpeg" id="r-jpg" />
                            <Label htmlFor="r-jpg" className="flex-1 cursor-pointer text-foreground">JPG (Smaller File Size)</Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors">
                            <RadioGroupItem value="pdf" id="r-pdf" />
                            <Label htmlFor="r-pdf" className="flex-1 cursor-pointer text-foreground">PDF (Document Format)</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button disabled={isExporting} onClick={handleExport} className="w-full sm:w-auto">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? "Exporting..." : "Download"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

import React, { useState } from "react";
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
import { useAutoResize, SOCIAL_SIZES } from "@/hooks/useAutoResize";

interface AutoResizeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
}

export const AutoResizeDialog: React.FC<AutoResizeDialogProps> = ({ open, onOpenChange, title }) => {
    const { stageRef, canvasWidth, canvasHeight } = useCanvasStore();
    const { processResize } = useAutoResize();
    const [isExporting, setIsExporting] = useState(false);
    
    // By default, select all sizes
    const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>(SOCIAL_SIZES.map(s => s.id));

    const handleToggleSize = (id: string) => {
        setSelectedSizeIds(prev => 
            prev.includes(id) 
                ? prev.filter(sId => sId !== id)
                : [...prev, id]
        );
    };

    const handleExport = async () => {
        if (!stageRef) return;
        
        const targetSizes = SOCIAL_SIZES.filter(s => selectedSizeIds.includes(s.id));
        if (targetSizes.length === 0) {
            toast.error("Please select at least one size to export.");
            return;
        }

        setIsExporting(true);
        try {
            // De-select any selected element before exporting
            useCanvasStore.getState().selectElement(null);

            await processResize(
                stageRef,
                canvasWidth,
                canvasHeight,
                targetSizes,
                title
            );

            onOpenChange(false);
            toast.success("Successfully downloaded social media pack!");
        } catch (err) {
            console.error("Auto-resize export failed:", err);
            toast.error("Failed to export designs.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Social Media Auto-Resize</DialogTitle>
                    <DialogDescription>
                        Generate and download your design in multiple social media formats at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    {SOCIAL_SIZES.map((size) => (
                        <div key={size.id} className="flex items-center space-x-3 border p-3 rounded-md cursor-pointer hover:bg-muted transition-colors" onClick={() => handleToggleSize(size.id)}>
                            <input 
                                type="checkbox"
                                id={`size-${size.id}`} 
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
                                checked={selectedSizeIds.includes(size.id)}
                                onChange={() => handleToggleSize(size.id)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 cursor-pointer">
                                <Label htmlFor={`size-${size.id}`} className="font-medium cursor-pointer text-foreground">
                                    {size.name}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {size.width} × {size.height} px
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button disabled={isExporting || selectedSizeIds.length === 0} onClick={handleExport} className="w-full sm:w-auto px-8">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? "Generating ZIP..." : `Download ${selectedSizeIds.length > 0 ? `(${selectedSizeIds.length})` : ''}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

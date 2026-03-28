import React from "react";
import { DesignPreview } from "@/components/create/DesignPreview";

interface CanvasContainerProps {
    /** Resolved image URL to display in the preview */
    imageUrl: string | null;
}

/**
 * Handles the display of the generated UI canvas preview.
 */
export function CanvasContainer({ imageUrl }: CanvasContainerProps) {
    return (
        <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden bg-muted/20 relative">
            <DesignPreview imageUrl={imageUrl} />
        </div>
    );
}

import JSZip from 'jszip';
import Konva from 'konva';

export interface ResizeOption {
    id: string;
    name: string;
    width: number;
    height: number;
}

export const SOCIAL_SIZES: ResizeOption[] = [
    { id: 'ig_post', name: 'Instagram Post', width: 1080, height: 1080 },
    { id: 'ig_story', name: 'Instagram Story', width: 1080, height: 1920 },
    { id: 'fb_cover', name: 'Facebook Cover', width: 820, height: 312 },
    { id: 'x_post', name: 'Twitter/X Post', width: 1200, height: 675 },
    { id: 'linkedin_banner', name: 'LinkedIn Banner', width: 1584, height: 396 },
    { id: 'youtube_thumb', name: 'YouTube Thumbnail', width: 1280, height: 720 },
    { id: 'tiktok', name: 'TikTok', width: 1080, height: 1920 },
];

export const useAutoResize = () => {
    const processResize = async (
        originalStage: Konva.Stage,
        originalWidth: number,
        originalHeight: number,
        targetSizes: ResizeOption[],
        projectName: string,
        aiBackgrounds?: Record<string, HTMLImageElement>
    ) => {
        const zip = new JSZip();
        
        // De-select anything so transformers don't show
        const transformer = originalStage.findOne('Transformer');
        if (transformer) {
            transformer.hide();
        }

        // Give React/Konva a tick to update the DOM (hide transformer)
        await new Promise((r) => setTimeout(r, 100));

        for (const size of targetSizes) {
            // Determine scale factor to FIT the content inside the new dimensions.
            const scaleX = size.width / originalWidth;
            const scaleY = size.height / originalHeight;
            const scale = Math.min(scaleX, scaleY);

            // TODO(QuantumEngine): Call POST /api/quantum/optimize here with the new size.width & size.height
            // If the Quantum layout API returns new coordinates, we should apply them instead of 
            // the uniform scaling group logic below. This will provide "Smart Refit" instead of just zooming.

            // Clone stage
            const stageClone = originalStage.clone();
            stageClone.width(size.width);
            stageClone.height(size.height);

            const layer = stageClone.getLayers()[0];
            if (layer) {
                // Handle Background image
                const bgImage = layer.findOne('#bgImage') as Konva.Image;
                if (bgImage) {
                    // Cek apakah ada AI background khusus untuk size ini
                    const customBgElement = aiBackgrounds?.[size.id];
                    
                    if (customBgElement) {
                        // Gunakan AI Background yang sudah di-expand
                        bgImage.image(customBgElement);
                        bgImage.width(size.width);
                        bgImage.height(size.height);
                        bgImage.x(0);
                        bgImage.y(0);
                    } else {
                        // Fallback: Scale background agar fill new stage (object-fit cover)
                        const bgScaleX = size.width / originalWidth;
                        const bgScaleY = size.height / originalHeight;
                        const bgScale = Math.max(bgScaleX, bgScaleY);
                        
                        bgImage.width(originalWidth * bgScale);
                        bgImage.height(originalHeight * bgScale);
                        
                        // Center the background
                        bgImage.x((size.width - originalWidth * bgScale) / 2);
                        bgImage.y((size.height - originalHeight * bgScale) / 2);
                    }
                }

                // Scale and center all other elements
                const scaledWidth = originalWidth * scale;
                const scaledHeight = originalHeight * scale;
                const offsetX = (size.width - scaledWidth) / 2;
                const offsetY = (size.height - scaledHeight) / 2;

                const group = new Konva.Group({
                    x: offsetX,
                    y: offsetY,
                    scaleX: scale,
                    scaleY: scale,
                });

                // Move all non-background children into the new scaling group
                const elementsToMove = layer.getChildren().filter(c => c.id() !== 'bgImage' && c.name() !== 'background');
                // Use a standard for loop since moveTo modifies the array we are iterating over if we used getChildren() directly
                const childrenArray = [...elementsToMove];
                childrenArray.forEach(c => {
                    c.moveTo(group);
                });

                layer.add(group);
            }

            // Adaptive pixel ratio: limit to max 4096px on longest side
            const maxDim = Math.max(stageClone.width(), stageClone.height());
            const adaptiveRatio = maxDim > 0 && maxDim * 2 > 4096 ? Math.floor(4096 / maxDim) : 2;

            // Export to data URL
            const dataUrl = stageClone.toDataURL({
                pixelRatio: adaptiveRatio,
                mimeType: 'image/jpeg',
                quality: 0.92,
            });

            // Convert Base64 to Blob
            const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
            zip.file(`${projectName.replace(/\s+/g, '_').toLowerCase()}_${size.name.replace(/\s+/g, '_').toLowerCase()}_${size.width}x${size.height}.jpg`, base64Data, { base64: true });
            
            // Cleanup the clone
            stageClone.destroy();
        }

        if (transformer) {
            transformer.show();
        }

        // Generate ZIP file
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Format the project name to be file friendly
        const safeProjectName = projectName
            ? projectName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/_$/, '').toLowerCase() 
            : 'untitled_design';
        
        // Download ZIP
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `SmartDesign_${safeProjectName}_SocialMediaPack.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return { processResize, SOCIAL_SIZES };
};

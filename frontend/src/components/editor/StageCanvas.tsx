import React from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import useImage from 'use-image';
import { useCanvasStore } from '@/store/useCanvasStore';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';
import { ShapeNode } from './ShapeNode';

interface StageCanvasProps {
    width: number;
    height: number;
}

export const StageCanvas: React.FC<StageCanvasProps> = ({ width, height }) => {
    const {
        elements,
        backgroundUrl,
        backgroundColor,
        selectedElementId,
        selectElement,
        updateElement,
    } = useCanvasStore();

    // Use proxy for external images to avoid CORS tainted canvas issues
    const proxiedBackgroundUrl = backgroundUrl && backgroundUrl.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(backgroundUrl)}`
        : backgroundUrl;

    const [bgImage, bgStatus] = useImage(proxiedBackgroundUrl || '', 'anonymous');

    React.useEffect(() => {
        // bgImage loaded
    }, [backgroundUrl, bgStatus, bgImage]);

    // Calculate relative scaling based on background boundaries
    // Assuming default canvas size of 1024x1024 for 1:1, etc.
    const logicalWidth = 1024;
    const logicalHeight = bgImage ? (bgImage.height / bgImage.width) * logicalWidth : 1024;

    const scale = Math.min(width / logicalWidth, height / logicalHeight);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStageClick = (e: any) => {
        // If we click on the empty stage, deselect
        if (e.target === e.target.getStage() || e.target.name() === 'background') {
            selectElement(null);
            return;
        }

        // Handle case where click was on a locked element
        const id = e.target.id();
        if (id) {
            const el = elements.find(el => el.id === id);
            if (el?.locked) {
                return; // Do not select if locked
            }
        }
    };

    // Fix infinite loop: only update store's ref if it hasn't been set to the same node
    const handleStageRef = React.useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node: any) => {
            if (node) {
                const currentState = useCanvasStore.getState().stageRef;
                if (currentState !== node) {
                    useCanvasStore.getState().setStageRef(node);
                }
            }
        },
        []
    );

    return (
        <Stage
            width={width}
            height={height}
            onMouseDown={handleStageClick}
            onTouchStart={handleStageClick}
            ref={handleStageRef}
            style={{ background: backgroundColor || '#ffffff', margin: '0 auto', display: 'flex', justifyContent: 'center' }}
        >
            <Layer scaleX={scale} scaleY={scale} x={(width - logicalWidth * scale) / 2} y={(height - logicalHeight * scale) / 2}>
                {/* Background Image */}
                {bgImage && (
                    <KonvaImage
                        image={bgImage}
                        width={logicalWidth}
                        height={logicalHeight}
                        id="bgImage"
                        name="background"
                    />
                )}
                {!bgImage && (
                    <KonvaImage
                        image={undefined}
                        width={logicalWidth}
                        height={logicalHeight}
                        fill={backgroundColor || "#ffffff"}
                        id="bgImage"
                        name="background"
                    />
                )}

                {/* Dynamic Elements */}
                {elements.map((el) => {
                    if (el.visible === false) return null; // Don't render hidden elements

                    if (el.type === 'text') {
                        return (
                            <TextNode
                                key={el.id}
                                element={el}
                                isSelected={el.id === selectedElementId && !el.locked}
                                onSelect={() => !el.locked && selectElement(el.id)}
                                onChange={(newAttrs) => !el.locked && updateElement(el.id, newAttrs)}
                            />
                        );
                    } else if (el.type === 'image') {
                        return (
                            <ImageNode
                                key={el.id}
                                element={el}
                                isSelected={el.id === selectedElementId && !el.locked}
                                onSelect={() => !el.locked && selectElement(el.id)}
                                onChange={(newAttrs) => !el.locked && updateElement(el.id, newAttrs)}
                            />
                        );
                    } else if (el.type === 'shape') {
                        return (
                            <ShapeNode
                                key={el.id}
                                element={el}
                                isSelected={el.id === selectedElementId && !el.locked}
                                onSelect={() => !el.locked && selectElement(el.id)}
                                onChange={(newAttrs) => !el.locked && updateElement(el.id, newAttrs)}
                            />
                        );
                    }
                    return null;
                })}
            </Layer>
        </Stage>
    );
};

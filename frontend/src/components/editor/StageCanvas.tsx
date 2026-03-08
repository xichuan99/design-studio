import React from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import useImage from 'use-image';
import { useCanvasStore } from '@/store/useCanvasStore';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';

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

    const [bgImage] = useImage(backgroundUrl || '', 'anonymous');

    // Calculate relative scaling based on background boundaries
    // Assuming default canvas size of 1024x1024 for 1:1, etc.
    const logicalWidth = 1024;
    const logicalHeight = bgImage ? (bgImage.height / bgImage.width) * logicalWidth : 1024;

    const scale = Math.min(width / logicalWidth, height / logicalHeight);

    const checkDeselect = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        // deselect when clicked on empty area (the stage itself or background)
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === 'bgImage';
        if (clickedOnEmpty) {
            selectElement(null);
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
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
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
                    />
                )}
                {!bgImage && (
                    <KonvaImage
                        image={undefined}
                        width={logicalWidth}
                        height={logicalHeight}
                        fill={backgroundColor || "#ffffff"}
                        id="bgImage"
                    />
                )}

                {/* Dynamic Elements */}
                {elements.map((el) => {
                    if (el.type === 'text') {
                        return (
                            <TextNode
                                key={el.id}
                                element={el}
                                isSelected={el.id === selectedElementId}
                                onSelect={() => selectElement(el.id)}
                                onChange={(newAttrs) => updateElement(el.id, newAttrs)}
                            />
                        );
                    } else if (el.type === 'image') {
                        return (
                            <ImageNode
                                key={el.id}
                                element={el}
                                isSelected={el.id === selectedElementId}
                                onSelect={() => selectElement(el.id)}
                                onChange={(newAttrs) => updateElement(el.id, newAttrs)}
                            />
                        );
                    }
                    return null;
                })}
            </Layer>
        </Stage>
    );
};

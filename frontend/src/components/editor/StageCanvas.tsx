import React from 'react';
import { Stage, Layer, Image as KonvaImage, Group } from 'react-konva';
import useImage from 'use-image';
import { useCanvasStore, CanvasElement } from '@/store/useCanvasStore';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';
import { ShapeNode } from './ShapeNode';

interface StageCanvasProps {
    width: number;
    height: number;
    onBgStatusChange?: (status: string) => void;
}

export const StageCanvas: React.FC<StageCanvasProps> = ({ width, height, onBgStatusChange }) => {
    const {
        elements,
        backgroundUrl,
        backgroundColor,
        selectedElementIds,
        highlightElementId,
        selectElement,
        updateElement,
        stageRef,
    } = useCanvasStore();

    // Use proxy for external images to avoid CORS tainted canvas issues
    const proxiedBackgroundUrl = backgroundUrl && backgroundUrl.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(backgroundUrl)}`
        : backgroundUrl;

    const [bgImage, bgStatus] = useImage(proxiedBackgroundUrl || '', 'anonymous');

    React.useEffect(() => {
        if (onBgStatusChange) {
            onBgStatusChange(bgStatus);
        }
    }, [bgStatus, onBgStatusChange]);

    // Blink highlight effect
    React.useEffect(() => {
        if (highlightElementId && stageRef) {
            const node = stageRef.findOne(`#${highlightElementId}`);
            if (node) {
                const originalOpacity = node.opacity() || 1;
                node.to({
                    opacity: 0.2,
                    duration: 0.15,
                    onFinish: () => {
                        node.to({
                            opacity: originalOpacity,
                            duration: 0.25,
                        });
                    }
                });
            }
        }
    }, [highlightElementId, stageRef]);

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

    const renderNode = (el: CanvasElement) => {
        if (el.visible === false) return null;

        if (el.type === 'text') {
            return (
                <TextNode
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) && !el.locked}
                    onSelect={(e) => {
                        if (el.locked) return;
                        const evt = e?.evt as MouseEvent;
                        if (evt?.shiftKey || evt?.ctrlKey || evt?.metaKey) {
                            useCanvasStore.getState().toggleSelectElement(el.id);
                        } else {
                            selectElement(el.id);
                        }
                    }}
                    onChange={(newAttrs) => !el.locked && updateElement(el.id, newAttrs)}
                />
            );
        } else if (el.type === 'image') {
            return (
                <ImageNode
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) && !el.locked}
                    onSelect={(e) => {
                        if (el.locked) return;
                        const evt = e?.evt as MouseEvent;
                        if (evt?.shiftKey || evt?.ctrlKey || evt?.metaKey) {
                            useCanvasStore.getState().toggleSelectElement(el.id);
                        } else {
                            selectElement(el.id);
                        }
                    }}
                    onChange={(newAttrs) => !el.locked && updateElement(el.id, newAttrs)}
                />
            );
        } else if (el.type === 'shape') {
            return (
                <ShapeNode
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) && !el.locked}
                    onSelect={(e) => {
                        if (el.locked) return;
                        const evt = e?.evt as MouseEvent;
                        if (evt?.shiftKey || evt?.ctrlKey || evt?.metaKey) {
                            useCanvasStore.getState().toggleSelectElement(el.id);
                        } else {
                            selectElement(el.id);
                        }
                    }}
                    onChange={(newAttrs) => !el.locked && updateElement(el.id, newAttrs)}
                />
            );
        } else if (el.type === 'group') {
            const children = elements.filter(child => child.parentId === el.id);
            return (
                <Group
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    rotation={el.rotation}
                    draggable={!el.locked}
                    onClick={(e) => {
                        e.cancelBubble = true;
                        if (el.locked) return;
                        const evt = e.evt as MouseEvent;
                        if (evt.shiftKey || evt.ctrlKey || evt.metaKey) {
                            useCanvasStore.getState().toggleSelectElement(el.id);
                        } else {
                            selectElement(el.id);
                        }
                    }}
                    onTap={(e) => {
                        e.cancelBubble = true;
                        if (el.locked) return;
                        const evt = e.evt as TouchEvent;
                        if (evt.shiftKey || evt.ctrlKey || evt.metaKey) {
                            useCanvasStore.getState().toggleSelectElement(el.id);
                        } else {
                            selectElement(el.id);
                        }
                    }}
                    onDragEnd={(e) => {
                        if (el.locked) return;
                        updateElement(el.id, {
                            x: e.target.x(),
                            y: e.target.y()
                        });
                    }}
                >
                    {children.map(child => renderNode(child))}
                </Group>
            );
        }
        return null;
    };

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
                    if (el.parentId) return null; // Rendered by parents
                    return renderNode(el);
                })}
            </Layer>
        </Stage>
    );
};

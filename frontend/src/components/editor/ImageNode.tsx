import React, { useRef, useEffect } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { CanvasElement } from '@/store/useCanvasStore';

interface ImageNodeProps {
    element: CanvasElement;
    isSelected: boolean;
    onSelect: (e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onChange: (newAttrs: Partial<CanvasElement>) => void;
}

export const ImageNode: React.FC<ImageNodeProps> = React.memo(({
    element,
    isSelected,
    onSelect,
    onChange,
}) => {
    const shapeRef = useRef<Konva.Image>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const url = element.url || '';
    const proxiedUrl = url.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(url)}`
        : url;

    const [image] = useImage(proxiedUrl, 'anonymous');

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <KonvaImage
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                x={element.x}
                y={element.y}
                image={image}
                width={element.width || (image ? image.width / 2 : 100)}
                height={element.height || (image ? image.height / 2 : 100)}
                rotation={element.rotation || 0}
                opacity={element.opacity ?? 1}
                cornerRadius={element.cornerRadius || 0}
                stroke={element.stroke}
                strokeWidth={element.strokeWidth || 0}
                visible={element.visible !== false}
                listening={!element.locked}
                draggable={!element.locked}
                onDragEnd={(e) => {
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    if (!node) return;

                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.scaleX(1);
                    node.scaleY(1);

                    onChange({
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                    });
                }}
            />

            {isSelected && !element.locked && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                />
            )}
        </>
    );
}, (prev, next) => prev.element === next.element && prev.isSelected === next.isSelected);

ImageNode.displayName = 'ImageNode';

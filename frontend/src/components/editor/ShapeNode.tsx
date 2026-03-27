import React, { useRef, useEffect } from 'react';
import { Rect, Circle, Transformer } from 'react-konva';
import Konva from 'konva';
import { CanvasElement } from '@/store/useCanvasStore';

export const getGradientProps = (element: CanvasElement, width: number, height: number, isCircle = false) => {
    if (element.fillType === 'gradient' && element.gradientColors) {
        const w = width;
        const h = height;
        let cx = w/2;
        let cy = h/2;
        if (isCircle) {
            cx = 0; cy = 0;
        }
        const angleDeg = element.gradientAngle || 90;
        const angleRad = (angleDeg - 90) * (Math.PI / 180); 
        const length = Math.abs(w * Math.cos(angleRad)) + Math.abs(h * Math.sin(angleRad));
        const startX = cx - (length / 2) * Math.cos(angleRad);
        const startY = cy - (length / 2) * Math.sin(angleRad);
        const endX = cx + (length / 2) * Math.cos(angleRad);
        const endY = cy + (length / 2) * Math.sin(angleRad);
        return {
            fillLinearGradientStartPoint: { x: startX, y: startY },
            fillLinearGradientEndPoint: { x: endX, y: endY },
            fillLinearGradientColorStops: [0, element.gradientColors[0], 1, element.gradientColors[1]],
        };
    }
    return { fill: element.fill || '#e2e8f0' };
};

interface ShapeNodeProps {
    element: CanvasElement;
    isSelected: boolean;
    onSelect: (e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onChange: (newAttrs: Partial<CanvasElement>) => void;
}

export const ShapeNode: React.FC<ShapeNodeProps> = React.memo(({
    element,
    isSelected,
    onSelect,
    onChange,
}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapeRef = useRef<any>(null);
    const trRef = useRef<Konva.Transformer>(null);

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected, element.shapeType]);

    const commonProps = {
        onClick: onSelect,
        onTap: onSelect,
        ref: shapeRef,
        x: element.x,
        y: element.y,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth || 0,
        rotation: element.rotation || 0,
        opacity: element.opacity ?? 1,
        shadowColor: element.shadowColor,
        shadowBlur: element.shadowBlur,
        shadowOffsetX: element.shadowOffsetX,
        shadowOffsetY: element.shadowOffsetY,
        shadowOpacity: element.shadowOpacity,
        draggable: !element.locked,
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
            onChange({
                x: e.target.x(),
                y: e.target.y(),
            });
        },
        onTransformEnd: () => {
            const node = shapeRef.current;
            if (!node) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            if (element.shapeType === 'circle') {
                onChange({
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    width: Math.max(5, (element.width || 100) * scaleX),
                    height: Math.max(5, (element.height || 100) * scaleY),
                });
            } else if (element.shapeType === 'line') {
                onChange({
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    width: Math.max(5, (element.width || 200) * scaleX),
                    height: Math.max(2, (element.height || 4) * scaleY),
                });
            } else {
                onChange({
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    width: Math.max(5, node.width() * scaleX),
                    height: Math.max(5, node.height() * scaleY),
                });
            }
        }
    };

    const renderShape = () => {
        switch (element.shapeType) {
            case 'circle':
                // Konva Circle uses radius, but we store width/height to make transforms easier
                return (
                    <Circle
                        {...commonProps}
                        {...getGradientProps(element, element.width || 100, element.height || 100, true)}
                        radius={(element.width || 100) / 2}
                        scaleY={(element.height || 100) / (element.width || 100)} // Support ellipses
                    />
                );
            case 'line':
                return (
                    <Rect
                        {...commonProps}
                        {...getGradientProps(element, element.width || 200, element.height || 4, false)}
                        width={element.width || 200}
                        height={element.height || 4} // Use a thin rect for lines so we have fill/stroke & cornerRadius
                        cornerRadius={element.cornerRadius || 0}
                    />
                );
            case 'rect':
            default:
                return (
                    <Rect
                        {...commonProps}
                        {...getGradientProps(element, element.width || 100, element.height || 100, false)}
                        width={element.width || 100}
                        height={element.height || 100}
                        cornerRadius={element.cornerRadius || 0}
                    />
                );
        }
    };

    return (
        <>
            {renderShape()}

            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    enabledAnchors={
                        element.shapeType === 'line'
                            ? ['middle-left', 'middle-right']
                            : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
                    }
                />
            )}
        </>
    );
}, (prev, next) => prev.element === next.element && prev.isSelected === next.isSelected);

ShapeNode.displayName = 'ShapeNode';

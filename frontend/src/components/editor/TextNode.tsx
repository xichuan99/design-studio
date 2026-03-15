import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Text, Transformer } from 'react-konva';
import { Html } from 'react-konva-utils';
import Konva from 'konva';
import { CanvasElement } from '@/store/useCanvasStore';
import { getGradientProps } from './ShapeNode';

interface TextNodeProps {
    element: CanvasElement;
    isSelected: boolean;
    onSelect: (e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onChange: (newAttrs: Partial<CanvasElement>) => void;
}

export const TextNode: React.FC<TextNodeProps> = ({
    element,
    isSelected,
    onSelect,
    onChange,
}) => {
    const shapeRef = useRef<Konva.Text>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (isSelected && !isEditing && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected, isEditing]);

    const handleDoubleClick = () => {
        onSelect();
        setIsEditing(true);
    };

    const handleEditEnd = useCallback((newText: string) => {
        setIsEditing(false);
        onChange({ text: newText });
    }, [onChange]);

    return (
        <>
            <Text
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={handleDoubleClick}
                onDblTap={handleDoubleClick}
                ref={shapeRef}
                x={element.x}
                y={element.y}
                text={element.text}
                fontSize={element.fontSize || 24}
                fontFamily={element.fontFamily || 'Inter'}
                {...getGradientProps(element, element.width || 200, element.height || 50)}
                align={element.align || 'left'}
                fontStyle={element.fontStyle || 'normal'}
                fontWeight={element.fontWeight || 'normal'}
                width={element.width}
                height={element.height}
                rotation={element.rotation || 0}
                letterSpacing={element.letterSpacing || 0}
                lineHeight={element.lineHeight || 1}
                stroke={element.stroke}
                strokeWidth={element.strokeWidth}
                opacity={isEditing ? 0 : (element.opacity ?? 1)}
                shadowColor={element.shadowColor}
                shadowBlur={element.shadowBlur}
                shadowOffsetX={element.shadowOffsetX}
                shadowOffsetY={element.shadowOffsetY}
                shadowOpacity={element.shadowOpacity}
                draggable={!isEditing}
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
                        fontSize: Math.round((element.fontSize || 24) * scaleY),
                    });
                }}
            />

            {/* Inline editing overlay */}
            {isEditing && (
                <Html
                    groupProps={{ x: element.x, y: element.y }}
                    divProps={{ style: { opacity: 1 } }}
                >
                    <textarea
                        autoFocus
                        defaultValue={element.text || ''}
                        style={{
                            width: `${element.width || 300}px`,
                            minHeight: '60px',
                            fontSize: `${element.fontSize || 24}px`,
                            fontFamily: element.fontFamily || 'Inter',
                            fontWeight: element.fontWeight || 'normal',
                            color: element.fill || '#000000',
                            textAlign: (element.align as React.CSSProperties['textAlign']) ?? 'left',
                            letterSpacing: `${element.letterSpacing || 0}px`,
                            lineHeight: element.lineHeight || 1.2,
                            border: '2px solid #3b82f6',
                            borderRadius: '4px',
                            padding: '4px',
                            background: 'rgba(255,255,255,0.9)',
                            outline: 'none',
                            resize: 'none',
                            overflow: 'hidden',
                        }}
                        onBlur={(e) => handleEditEnd(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                handleEditEnd((e.target as HTMLTextAreaElement).value);
                            }
                        }}
                    />
                </Html>
            )}

            {isSelected && !isEditing && (
                <Transformer
                    ref={trRef}
                    padding={0}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
                />
            )}
        </>
    );
};

import { CanvasElement } from '@/store/useCanvasStore';
import { v4 as uuidv4 } from 'uuid';

export interface AIParsedData {
    headline?: string;
    sub_headline?: string;
    cta?: string;
    suggested_colors?: string[];
}

export interface TemplateLayer {
    role: string;
    x: number;        // 0-1 proportional
    y: number;        // 0-1 proportional
    font_family?: string;
    font_weight?: number;
    font_size?: number;
    color?: string;
    shadow?: boolean;
    bg_box?: string;
}

/**
 * Creates CanvasElements mapped from the AI text parsing using template layouts.
 * Supports both array format (from DB seed) and record format (legacy).
 */
export function generateCanvasElementsFromTemplate(
    parsedData: AIParsedData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateLayers: TemplateLayer[] | Record<string, any>,
    canvasLogicalWidth: number = 1024,
    canvasLogicalHeight: number = 1024
): CanvasElement[] {
    const elements: CanvasElement[] = [];

    // Normalize: convert array format to a lookup by role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let layersByRole: Record<string, any> = {};

    if (Array.isArray(templateLayers)) {
        for (const layer of templateLayers) {
            if (layer.role) {
                layersByRole[layer.role] = layer;
            }
        }
    } else {
        layersByRole = templateLayers;
    }

    const createTextNode = (role: string, text: string): CanvasElement => {
        const layer = layersByRole[role];

        // Use template layer values, or fall back to sensible defaults
        const xProp = layer?.x ?? (role === 'headline' ? 0.5 : role === 'sub_headline' ? 0.5 : 0.5);
        const yProp = layer?.y ?? (role === 'headline' ? 0.15 : role === 'sub_headline' ? 0.35 : 0.8);

        // Convert proportional (0-1) to pixel coordinates
        // Center the text element by offsetting x by half the element width
        const elWidth = canvasLogicalWidth * 0.8;
        const x = (xProp * canvasLogicalWidth) - (elWidth / 2);
        const y = yProp * canvasLogicalHeight;

        const fontSize = layer?.font_size ?? (role === 'headline' ? 72 : role === 'sub_headline' ? 36 : 28);
        const fontFamily = layer?.font_family ?? 'Inter';
        const fill = layer?.color ?? '#000000';
        const fontWeightNum = layer?.font_weight ?? (role === 'headline' || role === 'cta' ? 700 : 400);

        return {
            id: uuidv4(),
            type: 'text',
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: elWidth,
            text: text,
            fontFamily: fontFamily,
            fontSize: fontSize,
            fill: fill,
            align: 'center',
            rotation: 0,
            fontWeight: fontWeightNum >= 600 ? 'bold' : 'normal',
        };
    };

    if (parsedData.headline) {
        elements.push(createTextNode('headline', parsedData.headline));
    }
    if (parsedData.sub_headline) {
        elements.push(createTextNode('sub_headline', parsedData.sub_headline));
    }
    if (parsedData.cta) {
        elements.push(createTextNode('cta', parsedData.cta));
    }

    return elements;
}


import { CanvasElement } from '@/store/useCanvasStore';
import { v4 as uuidv4 } from 'uuid';

export interface AITextLayout {
    x: number;       // 0-1 proportional
    y: number;       // 0-1 proportional
    font_family: string;
    font_size: number;
    font_weight: number;
    color: string;
    align: string;
}

export interface AIParsedData {
    headline?: string;
    sub_headline?: string;
    cta?: string;
    suggested_colors?: string[];
    headline_layout?: AITextLayout;
    sub_headline_layout?: AITextLayout;
    cta_layout?: AITextLayout;
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
 * Creates CanvasElements mapped from the AI text parsing using template layouts or AI dynamic layouts.
 * Priority: Template Layer > AI Layout Decision > Hardcoded Defaults
 * 
 * @param selectedVariationIndex — when > 0, picks that specific variation from quantumLayout
 */
export function generateCanvasElementsFromTemplate(
    parsedData: AIParsedData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateLayers: TemplateLayer[] | Record<string, any>,
    canvasLogicalWidth: number = 1024,
    canvasLogicalHeight: number = 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quantumLayout?: any,
    selectedVariationIndex: number = 0,
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

    // Use suggested colors if available, otherwise use readable defaults for AI backgrounds
    const primaryColor = parsedData.suggested_colors?.[0] || '#FFFFFF';
    const hasTemplateLayers = Object.keys(layersByRole).length > 0;

    const createTextNode = (role: string, text: string): CanvasElement => {
        const layer = layersByRole[role];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiLayout: AITextLayout | undefined = (parsedData as any)[`${role}_layout`];

        // Default positions designed for a professional layout with copy space
        const defaultPositions: Record<string, { x: number; y: number }> = {
            headline: { x: 0.5, y: 0.30 },
            sub_headline: { x: 0.5, y: 0.50 },
            cta: { x: 0.5, y: 0.75 },
        };
        const defaults = defaultPositions[role] || { x: 0.5, y: 0.5 };

        // Priority 0: Quantum Engine, Priority 1: Template Layer, Priority 2: AI Layout, Priority 3: Defaults
        
        const xProp = layer?.x ?? aiLayout?.x ?? defaults.x;
        const yProp = layer?.y ?? aiLayout?.y ?? defaults.y;
        
        // Convert proportional (0-1) to pixel coordinates
        // For x, we use the proportional value as the anchor point.
        // If align is left, x is the left edge. If center, x is the center. If right, x is the right edge.
        const alignStr = aiLayout?.align ?? 'center';
        // Ensure TS knows this is a valid Konva align type
        const align: 'left' | 'center' | 'right' = ['left', 'center', 'right'].includes(alignStr)
            ? (alignStr as 'left' | 'center' | 'right')
            : 'center';

        const elWidth = canvasLogicalWidth * 0.8;
        
        let x = xProp * canvasLogicalWidth;
        let y = yProp * canvasLogicalHeight;

        // Extract direct absolute coordinates if Quantum Layout is provided
        let usedQuantum = false;
        if (quantumLayout && quantumLayout.variations && quantumLayout.variations.length > 0) {
            const variant = quantumLayout.variations[selectedVariationIndex] || quantumLayout.variations[0];
            const qEl = variant.find((v: { role: string; x: number; y: number }) => v.role === role);
            if (qEl) {
                x = qEl.x;
                y = qEl.y;
                usedQuantum = true;
            }
        }

        // Adjust x based on alignment so the text block stays anchored properly (ONLY if not using absolute quantum coords)
        if (!usedQuantum) {
            if (align === 'center') {
                x = x - (elWidth / 2);
            } else if (align === 'right') {
                x = x - elWidth;
            }
        }

        // Note: For AI fallback on font_size, we use the defaults because Gemini might output
        // inappropriately small fonts sometimes depending on hallucinations.
        const defaultFontSize = role === 'headline' ? 88 : role === 'sub_headline' ? 48 : 36;
        let fontSize = layer?.font_size ?? aiLayout?.font_size ?? defaultFontSize;

        // Enforce logical minimums so AI doesn't make text unreadable
        if (role === 'headline' && fontSize < 60) fontSize = 60;
        if (role === 'sub_headline' && fontSize < 30) fontSize = 30;
        if (role === 'cta' && fontSize < 24) fontSize = 24;

        const fontFamily = layer?.font_family ?? aiLayout?.font_family ?? 'Montserrat';

        // For AI generated layouts without template layers, always add a subtle shadow for readability
        const shouldAddShadow = !hasTemplateLayers;

        // When no template layers: use AI layout color or fallback to white text for AI backgrounds
        const aiColorFallback = role === 'cta' ? primaryColor : '#FFFFFF';
        const fill = layer?.color ?? aiLayout?.color ?? (hasTemplateLayers ? '#000000' : aiColorFallback);

        const defaultFontWeight = role === 'headline' || role === 'cta' ? 700 : 400;
        const fontWeightNum = layer?.font_weight ?? aiLayout?.font_weight ?? defaultFontWeight;

        return {
            id: uuidv4(),
            type: 'text',
            x: Math.max(20, Math.min(x, canvasLogicalWidth - elWidth - 20)), // Keep within padding
            y: Math.max(20, Math.min(y, canvasLogicalHeight - 100)), // Keep within padding
            width: elWidth,
            text: text,
            fontFamily: fontFamily,
            fontSize: fontSize,
            fill: fill,
            align: align,
            rotation: 0,
            fontWeight: fontWeightNum >= 600 ? 'bold' : 'normal',
            shadowColor: shouldAddShadow ? 'rgba(0, 0, 0, 0.7)' : undefined,
            shadowBlur: shouldAddShadow ? 8 : undefined,
            shadowOffsetX: shouldAddShadow ? 2 : undefined,
            shadowOffsetY: shouldAddShadow ? 2 : undefined,
            shadowOpacity: shouldAddShadow ? 1 : undefined,
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


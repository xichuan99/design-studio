import type { CanvasElement } from '@/store/useCanvasStore';

export const CURRENT_CANVAS_SCHEMA_VERSION = 1;

export interface PersistedCanvasState {
    elements: CanvasElement[];
    backgroundUrl: string | null;
    backgroundColor: string;
    originalPrompt?: string | null;
}

export interface VersionedCanvasPayload {
    canvas_state: PersistedCanvasState;
    canvas_schema_version: number;
}

export function normalizeCanvasState(
    canvasState?: Partial<PersistedCanvasState> | null
): PersistedCanvasState {
    return {
        elements: Array.isArray(canvasState?.elements)
            ? (canvasState?.elements as CanvasElement[])
            : [],
        backgroundUrl: canvasState?.backgroundUrl ?? null,
        backgroundColor: canvasState?.backgroundColor ?? '#ffffff',
        originalPrompt: canvasState?.originalPrompt ?? null,
    };
}

export function buildVersionedCanvasPayload(
    canvasState?: Partial<PersistedCanvasState> | null,
    canvasSchemaVersion?: number | null
): VersionedCanvasPayload {
    return {
        canvas_state: normalizeCanvasState(canvasState),
        canvas_schema_version:
            canvasSchemaVersion ?? CURRENT_CANVAS_SCHEMA_VERSION,
    };
}
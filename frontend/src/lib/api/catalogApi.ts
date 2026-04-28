import { useCallback } from 'react';

import { useApiCore } from './coreApi';
import type {
    CatalogBasicsRequest,
    CatalogFinalizePlanRequest,
    CatalogFinalizePlanResponse,
    CatalogGenerateCopyRequest,
    CatalogGenerateCopyResponse,
    CatalogImageMappingRequest,
    CatalogImageMappingResponse,
    CatalogPlanStructureResponse,
    CatalogSuggestStylesRequest,
    CatalogSuggestStylesResponse,
} from './types';


export function useCatalogEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const planCatalogStructure = useCallback(async (payload: CatalogBasicsRequest): Promise<CatalogPlanStructureResponse> => {
        const res = await fetch(`${API_BASE_URL}/catalog/plan-structure`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to plan catalog structure');
        }

        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const suggestCatalogStyles = useCallback(async (payload: CatalogSuggestStylesRequest): Promise<CatalogSuggestStylesResponse> => {
        const res = await fetch(`${API_BASE_URL}/catalog/suggest-styles`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to suggest catalog styles');
        }

        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const mapCatalogImages = useCallback(async (payload: CatalogImageMappingRequest): Promise<CatalogImageMappingResponse> => {
        const res = await fetch(`${API_BASE_URL}/catalog/map-images`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to map catalog images');
        }

        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const generateCatalogCopy = useCallback(async (payload: CatalogGenerateCopyRequest): Promise<CatalogGenerateCopyResponse> => {
        const res = await fetch(`${API_BASE_URL}/catalog/generate-copy`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate catalog copy');
        }

        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const finalizeCatalogPlan = useCallback(async (payload: CatalogFinalizePlanRequest): Promise<CatalogFinalizePlanResponse> => {
        const res = await fetch(`${API_BASE_URL}/catalog/finalize-plan`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to finalize catalog plan');
        }

        return res.json();
    }, [API_BASE_URL, getHeaders]);

    return {
        planCatalogStructure,
        suggestCatalogStyles,
        mapCatalogImages,
        generateCatalogCopy,
        finalizeCatalogPlan,
    };
}

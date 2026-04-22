import { useCallback } from 'react';

import { useApiCore } from './coreApi';
import type {
    CarouselExportRequest,
    CarouselGenerateRequest,
    CarouselGenerateResponse,
    CarouselRegenerateSlideRequest,
    CarouselSlide,
} from './types';


export function useCarouselApi() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const generateCarousel = useCallback(async (payload: CarouselGenerateRequest): Promise<CarouselGenerateResponse> => {
        const res = await fetch(`${API_BASE_URL}/carousel/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate carousel');
        }

        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const regenerateCarouselSlide = useCallback(async (payload: CarouselRegenerateSlideRequest): Promise<CarouselSlide> => {
        const res = await fetch(`${API_BASE_URL}/carousel/regenerate-slide`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to regenerate slide');
        }

        const data = await res.json();
        return data.slide;
    }, [API_BASE_URL, getHeaders]);

    const exportCarouselZip = useCallback(async (payload: CarouselExportRequest): Promise<Blob> => {
        const res = await fetch(`${API_BASE_URL}/carousel/export`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            let errorDetail = 'Failed to export carousel';
            try {
                const errBase = await res.json();
                errorDetail = (errBase?.error?.detail || errBase?.detail) || errorDetail;
            } catch {
                // Ignore JSON parsing failure for binary response bodies.
            }
            throw new Error(errorDetail);
        }

        return res.blob();
    }, [API_BASE_URL, getHeaders]);

    return {
        generateCarousel,
        regenerateCarouselSlide,
        exportCarouselZip,
    };
}
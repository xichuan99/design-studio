import { useApiCore } from './coreApi';
import * as Types from './types';
import { useCallback } from 'react';

export function useBrandKitEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const extractBrandColors = useCallback(async (file: File): Promise<{ colors: Types.ColorSwatch[] }> => {
            const formData = new FormData();
            formData.append('file', file);
            const headers = getHeaders();
            delete headers['Content-Type']; // Let browser set multipart boundary

            const res = await fetch(`${API_BASE_URL}/brand-kits/extract`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to extract colors');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const saveBrandKit = useCallback(async (data: Omit<Types.BrandKitProfile, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Types.BrandKitProfile> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                console.error("saveBrandKit error response json:", errBase);
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to save Brand Kit');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const generateBrandKit = useCallback(async (req: Types.GenerateBrandKitRequest): Promise<Partial<Types.BrandKitProfile>> => {
        const res = await fetch(`${API_BASE_URL}/brand-kits/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(req),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate Brand Kit');
        }
        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const extractBrandFromUrl = useCallback(async (url: string): Promise<Partial<Types.BrandKitProfile>> => {
        const res = await fetch(`${API_BASE_URL}/brand-kits/extract-from-url`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ url }),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to extract Brand Kit from URL');
        }
        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const getBrandKits = useCallback(async (folderId?: string): Promise<Types.BrandKit[]> => {
            const params = new URLSearchParams();
            if (folderId !== undefined) {
                 params.set('folder_id', folderId);
            }
            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/brand-kits${qs}`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch brand kits');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getActiveBrandKit = useCallback(async (): Promise<Types.BrandKit | null> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits/active`, { headers: getHeaders() });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch active brand kit');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const updateBrandKit = useCallback(async (id: string, data: Partial<Types.BrandKit>): Promise<Types.BrandKit> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update Brand Kit');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const deleteBrandKit = useCallback(async (id: string): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete Brand Kit');
        }, [API_BASE_URL, getHeaders]);

    const uploadBrandGuideline = useCallback(async (kitId: string, file: File): Promise<{ status: string, chunks_stored: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const headers = getHeaders();
        // Browser sets multipart boundary automatically
        delete headers['Content-Type'];

        const res = await fetch(`${API_BASE_URL}/brand-kits/${kitId}/documents`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to upload document');
        }
        return res.json();
    }, [API_BASE_URL, getHeaders]);

    return { 
        extractBrandColors, 
        saveBrandKit, 
        getBrandKits, 
        getActiveBrandKit, 
        updateBrandKit, 
        deleteBrandKit, 
        generateBrandKit, 
        extractBrandFromUrl,
        uploadBrandGuideline
    };
}

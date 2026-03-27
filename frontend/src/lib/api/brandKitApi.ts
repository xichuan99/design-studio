import { useApiCore } from './coreApi';
import * as Types from './types';

export function useBrandKitEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const extractBrandColors = async (file: File): Promise<{ colors: Types.ColorSwatch[] }> => {
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
        };

    const saveBrandKit = async (data: Omit<Types.BrandKitProfile, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Types.BrandKitProfile> => {
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
        };

    const generateBrandKit = async (req: Types.GenerateBrandKitRequest): Promise<Partial<Types.BrandKitProfile>> => {
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
    };

    const extractBrandFromUrl = async (url: string): Promise<Partial<Types.BrandKitProfile>> => {
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
    };

    const getBrandKits = async (folderId?: string): Promise<Types.BrandKit[]> => {
            const params = new URLSearchParams();
            if (folderId !== undefined) {
                 params.set('folder_id', folderId);
            }
            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/brand-kits${qs}`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch brand kits');
            return res.json();
        };

    const getActiveBrandKit = async (): Promise<Types.BrandKit | null> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits/active`, { headers: getHeaders() });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch active brand kit');
            return res.json();
        };

    const updateBrandKit = async (id: string, data: Partial<Types.BrandKit>): Promise<Types.BrandKit> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update Brand Kit');
            return res.json();
        };

    const deleteBrandKit = async (id: string): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/brand-kits/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete Brand Kit');
        };

    return { extractBrandColors, saveBrandKit, getBrandKits, getActiveBrandKit, updateBrandKit, deleteBrandKit, generateBrandKit, extractBrandFromUrl };
}

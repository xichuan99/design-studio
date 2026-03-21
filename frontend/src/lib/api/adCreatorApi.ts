import { useApiCore } from './coreApi';

export interface AdConcept {
    id: string;
    concept_name: string;
    image_url: string;
    headline: string;
    tagline: string;
    call_to_action: string;
}

export interface AdCreatorResponse {
    foreground_url: string;
    concepts: AdConcept[];
}

async function fetchWithTimeout(resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 120000, ...fetchOptions } = options; // Default 120 seconds
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...fetchOptions,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

export function useAdCreatorEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const generateSmartAd = async (payload: {
        image_base64: string;
        brief?: string;
        brand_kit_id?: string;
    }): Promise<AdCreatorResponse> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/ad-creator/generate`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
                timeout: 125000 // Fal AI concurrency + Gemini can take up to ~30-60s
            });
            
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate Smart Ad');
            }
            return res.json();
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                throw new Error('Waktu koneksi habis. Server mungkin sedang sibuk, silakan coba lagi.');
            }
            if (err.message === 'Failed to fetch') {
                throw new Error('Koneksi terputus. Pembuatan gambar butuh waktu lama, silakan coba lagi.');
            }
            throw error;
        }
    };

    const batchResize = async (payload: {
        image_url: string;
        target_sizes: string[];
    }): Promise<{ results: Record<string, string> }> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/ad-creator/batch-resize`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
                timeout: 125000 // Fal AI concurrency
            });
            
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to batch resize Ad');
            }
            return res.json();
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                throw new Error('Waktu koneksi habis. Server mungkin sedang sibuk, silakan coba lagi.');
            }
            if (err.message === 'Failed to fetch') {
                throw new Error('Koneksi terputus. Proses resize butuh waktu lama, silakan coba lagi.');
            }
            throw error;
        }
    };

    return { generateSmartAd, batchResize };
}

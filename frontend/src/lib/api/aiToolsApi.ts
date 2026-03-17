import { useApiCore } from './coreApi';
import * as Types from './types';

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

export function useAiToolsEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const generateDesign = async (payload: {
            raw_text: string;
            aspect_ratio: string;
            style_preference?: string;
            reference_image_url?: string;
            template_id?: string;
            integrated_text?: boolean;
            remove_product_bg?: boolean;
            product_image_url?: string;
            brand_kit_id?: string; // Added brand_kit_id
        }) => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/designs/generate`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    timeout: 125000 // 125 seconds, allowing Nginx 120s to trigger first or taking over if it hangs
                });
                if (!res.ok) {
                    const errBase = await res.json().catch(() => ({}));
                    throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate design');
                }
                return res.json();
            } catch (error: unknown) {
                const err = error as Error;
                if (err.name === 'AbortError') {
                    throw new Error('Waktu koneksi habis saat merender gambar. Server mungkin sedang sibuk, silakan coba lagi.');
                }
                if (err.message === 'Failed to fetch') {
                    throw new Error('Koneksi terputus dari server (Timeout). Pembuatan gambar butuh waktu lama, silakan coba lagi.');
                }
                throw error;
            }
        };

    const clarifyCopywriting = async (payload: {
            product_description: string;
        }) => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/designs/clarify-copywriting`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    timeout: 60000
                });
                if (!res.ok) {
                    const errBase = await res.json().catch(() => ({}));
                    throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to clarify copywriting');
                }
                return res.json();
            } catch (error: unknown) {
                const err = error as Error;
                if (err.name === 'AbortError' || err.message === 'Failed to fetch') {
                    throw new Error('Koneksi terputus (Timeout). Proses AI butuh waktu lebih lama, silakan coba lagi.');
                }
                throw error;
            }
        };

    const clarifyUnified = async (payload: {
            raw_text: string;
            mode?: string;
        }) => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/designs/clarify-unified`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    timeout: 60000
                });
                if (!res.ok) {
                    const errBase = await res.json().catch(() => ({}));
                    throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate unified clarification questions');
                }
                return res.json();
            } catch (error: unknown) {
                const err = error as Error;
                if (err.name === 'AbortError' || err.message === 'Failed to fetch') {
                    throw new Error('Koneksi terputus (Timeout). Proses AI butuh waktu lebih lama, silakan coba lagi.');
                }
                throw error;
            }
        };

    const generateCopywriting = async (payload: {
            product_description: string;
            tone?: string;
            brand_name?: string;
            clarification_answers?: Record<string, string>;
        }): Promise<{ variations: Types.CopywritingVariation[] }> => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/designs/generate-copywriting`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    timeout: 25000 // Reduced from 60s to 25s to stop infinite loading
                });
                if (!res.ok) {
                    const errBase = await res.json().catch(() => ({}));
                    throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate copywriting');
                }
                return res.json();
            } catch (error: unknown) {
                const err = error as Error;
                if (err.name === 'AbortError') {
                    throw new Error('Koneksi AI butuh waktu terlalu lama, mungkin server sedang sibuk. Silakan ketuk tombol Buat kembali.');
                }
                if (err.message === 'Failed to fetch') {
                    throw new Error('Koneksi terputus (Timeout). Proses AI butuh waktu lebih lama, silakan coba lagi.');
                }
                throw error;
            }
        };

    const parseDesignText = async (payload: {
            raw_text: string;
            aspect_ratio?: string;
            style_preference?: string;
            num_variations?: number;
            integrated_text?: boolean;
            clarification_answers?: Record<string, string>;
        }) => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/designs/parse`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    timeout: 25000 // Reduced from 60s to 25s for fail fast
                });
                if (!res.ok) {
                    const errBase = await res.json().catch(() => ({}));
                    throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to parse design text');
                }
                return res.json();
            } catch (error: unknown) {
                const err = error as Error;
                if (err.name === 'AbortError') {
                    throw new Error('Koneksi AI butuh waktu terlalu lama, mungkin server sedang sibuk. Silakan ketuk tombol Buat kembali.');
                }
                if (err.message === 'Failed to fetch') {
                    throw new Error('Koneksi terputus (Timeout). Proses AI butuh waktu lebih lama, silakan coba lagi.');
                }
                throw error;
            }
        };

    const uploadImage = async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
    
            // Custom headers to avoid application/json content-type
            // @ts-expect-error session token
            const token = session?.accessToken;
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
    
            const res = await fetch(`${API_BASE_URL}/designs/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to upload image');
            }
            return res.json(); // returns { url: string }
        };

    const getJobStatus = async (jobId: string) => {
            const res = await fetch(`${API_BASE_URL}/designs/jobs/${jobId}`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch job status');
            return res.json();
        };

    const getMyGenerations = async (limit: number = 20, offset: number = 0) => {
            const qs = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() }).toString();
            const res = await fetch(`${API_BASE_URL}/designs/my-generations?${qs}`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch AI generations');
            return res.json();
        };

    /**
     * Delete a generation job and reclaim storage quota.
     * @param jobId The UUID of the job to delete
     */
    const deleteGeneration = async (jobId: string) => {
        const res = await fetch(`${API_BASE_URL}/designs/jobs/${jobId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to delete generation');
        }
        // Returns 204 No Content, so no JSON parsing needed
        return true;
    };

    const generateMagicTextLayout = async (payload: { image_base64: string; text: string; canvas_width?: number; canvas_height?: number; style_hint?: string }) => {
            const res = await fetch(`${API_BASE_URL}/designs/magic-text`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate magic text layout');
            }
            return res.json();
        };

    const removeBackground = async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
    
            // Custom headers to avoid application/json content-type
            // @ts-expect-error session token
            const token = session?.accessToken;
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
    
            const res = await fetch(`${API_BASE_URL}/designs/remove-background`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to remove background');
            }
            return res.json(); // returns { url: string }
        };

    const upscaleImage = async (file: File, scale: number = 2.0): Promise<{ url: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('scale', scale.toString());
    
            const response = await fetch(`${API_BASE_URL}/tools/upscale`, {
                method: 'POST',
                headers: getHeaders(true), // true implies skipContentType
                body: formData,
            });
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to upscale image');
            }
            return response.json();
        };

    const generateTextBanner = async (payload: {
            text: string;
            style?: string;
            color_hint?: string;
            quality?: string;
        }): Promise<{ url: string, width?: number, height?: number }> => {
            const formData = new FormData();
            formData.append('text', payload.text);
            if (payload.style) formData.append('style', payload.style);
            if (payload.color_hint) formData.append('color_hint', payload.color_hint);
            if (payload.quality) formData.append('quality', payload.quality);
    
            const response = await fetch(`${API_BASE_URL}/tools/text-banner`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate text banner');
            }
            return response.json();
        };

    const retouchImage = async (file: File, outputFormat: 'jpeg' | 'png' = 'jpeg', fidelity: number = 0.7): Promise<{ url: string, before_url: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('output_format', outputFormat);
            formData.append('fidelity', fidelity.toString());
    
            const response = await fetch(`${API_BASE_URL}/tools/retouch`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to retouch image');
            }
            return response.json();
        };

    const generateIdPhoto = async (
            file: File, 
            bgColor: string, 
            size: string, 
            customW?: string, 
            customH?: string,
            outputFormat: 'jpeg' | 'png' = 'jpeg',
            includePrintSheet: boolean = false
        ): Promise<{ url: string, print_sheet_url?: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bg_color', bgColor);
            formData.append('size', size);
            if (customW) formData.append('custom_width_cm', customW);
            if (customH) formData.append('custom_height_cm', customH);
            formData.append('output_format', outputFormat);
            formData.append('include_print_sheet', includePrintSheet ? 'true' : 'false');
    
            const response = await fetch(`${API_BASE_URL}/tools/id-photo`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate ID photo');
            }
            return response.json();
        };

    const magicEraser = async (
            file: File,
            mask: File,
            prompt?: string
        ): Promise<{ url: string, width?: number, height?: number }> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mask', mask);
            if (prompt) formData.append('prompt', prompt);
    
            const response = await fetch(`${API_BASE_URL}/tools/magic-eraser`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to apply Magic Eraser');
            }
            return response.json();
        };

    const generativeExpand = async (
            file: File,
            direction?: string,
            pixels?: number,
            targetWidth?: number,
            targetHeight?: number,
            prompt?: string
        ): Promise<{ url: string, width?: number, height?: number }> => {
            const formData = new FormData();
            formData.append('file', file);
            
            if (direction) formData.append('direction', direction);
            if (pixels !== undefined) formData.append('pixels', pixels.toString());
            if (targetWidth !== undefined) formData.append('target_width', targetWidth.toString());
            if (targetHeight !== undefined) formData.append('target_height', targetHeight.toString());
            if (prompt) formData.append('prompt', prompt);
    
            const response = await fetch(`${API_BASE_URL}/tools/generative-expand`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to apply Generative Expand');
            }
            return response.json();
        };

    const backgroundSwap = async (
            file: File,
            prompt?: string,
        ): Promise<{ url: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            if (prompt) formData.append('prompt', prompt);
    
            const response = await fetch(`${API_BASE_URL}/tools/background-swap`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to apply background swap');
            }
            return response.json();
        };

    const suggestBackgrounds = async (
            file: File
        ): Promise<{ suggestions: Array<{ title: string; emoji: string; prompt: string }> }> => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetchWithTimeout(`${API_BASE_URL}/tools/background-suggest`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
                timeout: 60000, // Florence-2 + Gemini: allow up to 60s
            });

            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Gagal menganalisis gambar');
            }
            return response.json();
        };

    const productScene = async (
            file: File,
            theme: string,
            aspectRatio: string
        ): Promise<{ url: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('theme', theme);
            formData.append('aspect_ratio', aspectRatio);
    
            const response = await fetch(`${API_BASE_URL}/tools/product-scene`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to generate product scene');
            }
            return response.json();
        };

    const batchProcess = async (
            files: File[],
            operation: string,
            paramsJson: string,
            logo?: File
        ): Promise<{ url: string, success_count: number, error_count: number, errors: Array<{filename: string, error: string}> }> => {
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            formData.append('operation', operation);
            formData.append('params_json', paramsJson);
            if (logo) formData.append('logo', logo);
    
            const response = await fetch(`${API_BASE_URL}/tools/batch`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to process batch');
            }
            return response.json();
        };

    const applyWatermark = async (
            file: File,
            logo: File,
            position: string,
            opacity: string,
            scale: string
        ): Promise<{ url: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('logo', logo);
            formData.append('position', position);
            formData.append('opacity', opacity);
            formData.append('scale', scale);
    
            const response = await fetch(`${API_BASE_URL}/tools/watermark`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            
            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to apply watermark');
            }
            return response.json();
        };    const getMyToolResults = async (toolName?: string, limit: number = 20, offset: number = 0) => {
            const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
            if (toolName) params.append('tool_name', toolName);
            
            const res = await fetch(`${API_BASE_URL}/tools/my-results?${params.toString()}`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch AI tool results');
            return res.json();
        };

    const deleteToolResult = async (resultId: string) => {
            const res = await fetch(`${API_BASE_URL}/tools/results/${resultId}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete AI tool result');
            // Returns 204 No Content, so no JSON parsing needed
            return true;
        };

    // --- Brand Kit API ---

    const generateProjectTitle = async (prompt: string) => {
            const res = await fetch(`${API_BASE_URL}/designs/generate-title`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error('Failed to generate project title');
            return res.json();
        };

    const redesignFromReference = async (payload: {
            reference_image_url: string;
            raw_text?: string;
            strength?: number;
            aspect_ratio: string;
            brand_kit_id?: string;
        }) => {
            try {
                const res = await fetchWithTimeout(`${API_BASE_URL}/designs/redesign`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload),
                    timeout: 125000 // 125 seconds, same as generateDesign
                });
                if (!res.ok) {
                    const errBase = await res.json().catch(() => ({}));
                    throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to redesign image');
                }
                return res.json();
            } catch (error: unknown) {
                const err = error as Error;
                if (err.name === 'AbortError') {
                    throw new Error('Waktu koneksi habis saat merender gambar redesign. Server mungkin sedang sibuk, silakan coba lagi.');
                }
                if (err.message === 'Failed to fetch') {
                    throw new Error('Koneksi terputus dari server (Timeout). Proses redesign butuh waktu lama, silakan coba lagi.');
                }
                throw error;
            }
        };

    return { generateDesign, redesignFromReference, clarifyCopywriting, clarifyUnified, generateCopywriting, parseDesignText, uploadImage, getJobStatus, getMyGenerations, deleteGeneration, generateMagicTextLayout, removeBackground, upscaleImage, generateTextBanner, retouchImage, generateIdPhoto, magicEraser, generativeExpand, backgroundSwap, suggestBackgrounds, productScene, batchProcess, applyWatermark, getMyToolResults, deleteToolResult, generateProjectTitle };
}

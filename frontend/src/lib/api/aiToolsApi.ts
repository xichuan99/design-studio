import { useApiCore } from './coreApi';
import * as Types from './types';
import { useCallback } from 'react';

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

    const generateDesign = useCallback(async (payload: Types.GenerateDesignRequest): Promise<Types.DesignGenerationResponse> => {
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
        }, [API_BASE_URL, getHeaders]);

    const clarifyCopywriting = useCallback(async (payload: Types.CopywritingClarifyRequest) => {
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
        }, [API_BASE_URL, getHeaders]);

    const clarifyUnified = useCallback(async (payload: Types.ClarifyUnifiedRequest) => {
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
        }, [API_BASE_URL, getHeaders]);

    const generateCopywriting = useCallback(async (payload: Types.CopywritingRequest): Promise<Types.CopywritingResponse> => {
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
        }, [API_BASE_URL, getHeaders]);

    const parseDesignText = useCallback(async (payload: Types.ParseDesignTextRequest): Promise<Types.ParsedTextElements> => {
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
        }, [API_BASE_URL, getHeaders]);

    const uploadImage = useCallback(async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
    
            const res = await fetch(`${API_BASE_URL}/designs/upload`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to upload image');
            }
            return res.json(); // returns { url: string }
        }, [API_BASE_URL, getHeaders]);

    const getJobStatus = useCallback(async (jobId: string) => {
            const res = await fetch(`${API_BASE_URL}/designs/jobs/${jobId}`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch job status');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getMyGenerations = useCallback(async (limit: number = 20, offset: number = 0, folderId?: string | null) => {
            const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
            if (folderId) params.append('folder_id', folderId);
            
            const res = await fetch(`${API_BASE_URL}/designs/my-generations?${params.toString()}`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch AI generations');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const createToolJob = useCallback(async (payload: Types.CreateToolJobRequest): Promise<Types.AiToolJob> => {
            const res = await fetch(`${API_BASE_URL}/tools/jobs`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to create AI tool job');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const createPipelineJob = useCallback(async (payload: Types.CreatePipelineJobRequest): Promise<Types.AiToolJob> => {
            const res = await fetch(`${API_BASE_URL}/tools/pipeline`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to create pipeline job');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const executePipelinePreview = useCallback(async (payload: Types.ExecutePipelinePreviewRequest): Promise<Types.ExecutePipelinePreviewResponse> => {
            const res = await fetch(`${API_BASE_URL}/tools/pipeline/preview`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to execute pipeline preview');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getToolJobStatus = useCallback(async (jobId: string): Promise<Types.AiToolJob> => {
            const res = await fetch(`${API_BASE_URL}/tools/jobs/${jobId}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch AI tool job status');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const cancelToolJob = useCallback(async (jobId: string): Promise<Types.AiToolJob> => {
            const res = await fetch(`${API_BASE_URL}/tools/jobs/${jobId}/cancel`, {
                method: 'POST',
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to cancel AI tool job');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getMyToolJobs = useCallback(async (toolName?: Types.AiToolJobName, limit: number = 20, offset: number = 0): Promise<Types.AiToolJob[]> => {
            const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
            if (toolName) params.append('tool_name', toolName);

            const res = await fetch(`${API_BASE_URL}/tools/my-jobs?${params.toString()}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch AI tool jobs');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    /**
     * Delete a generation job and reclaim storage quota.
     * @param jobId The UUID of the job to delete
     */
    const deleteGeneration = useCallback(async (jobId: string) => {
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
    }, [API_BASE_URL, getHeaders]);

    const generateMagicTextLayout = useCallback(async (payload: Types.MagicTextRequest): Promise<Types.MagicTextResponse> => {
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
        }, [API_BASE_URL, getHeaders]);

    const removeBackground = useCallback(async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
    
            const res = await fetch(`${API_BASE_URL}/designs/remove-background`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to remove background');
            }
            return res.json(); // returns { url: string }
        }, [API_BASE_URL, getHeaders]);

    const upscaleImage = useCallback(async (file: File, scale: number = 2.0): Promise<{ url: string }> => {
            void file;
            void scale;
            throw new Error('Fitur Upscaler sudah dinonaktifkan');
        }, []);

    const retouchImage = useCallback(async (file: File, outputFormat: 'jpeg' | 'png' = 'jpeg', fidelity: number = 0.7): Promise<{ url: string, before_url: string }> => {
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
        }, [API_BASE_URL, getHeaders]);

    const generateIdPhoto = useCallback(async (
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
        }, [API_BASE_URL, getHeaders]);

    const magicEraser = useCallback(async (
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
        }, [API_BASE_URL, getHeaders]);

    const backgroundSwap = useCallback(async (
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
        }, [API_BASE_URL, getHeaders]);

    const suggestBackgrounds = useCallback(async (
            file: File,
            context?: {
                productCategory?: string;
                targetChannel?: string;
                audience?: string;
                brandTone?: string;
                priceTier?: string;
            }
        ): Promise<{ suggestions: Array<{ title: string; emoji: string; prompt: string; rationale?: string; best_for?: string; risk_note?: string }> }> => {
            const formData = new FormData();
            formData.append('file', file);
            if (context?.productCategory) formData.append('product_category', context.productCategory);
            if (context?.targetChannel) formData.append('target_channel', context.targetChannel);
            if (context?.audience) formData.append('audience', context.audience);
            if (context?.brandTone) formData.append('brand_tone', context.brandTone);
            if (context?.priceTier) formData.append('price_tier', context.priceTier);

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
        }, [API_BASE_URL, getHeaders]);

    const productScene = useCallback(async (
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
        }, [API_BASE_URL, getHeaders]);

    const preflightProductScene = useCallback(async (
            file: File,
        ): Promise<Types.ProductScenePreflightResponse> => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/tools/product-scene/preflight`, {
                method: 'POST',
                headers: getHeaders(true),
                body: formData,
            });

            if (!response.ok) {
                const errBase = await response.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to preflight product scene');
            }
            return response.json();
        }, [API_BASE_URL, getHeaders]);

    const batchProcess = useCallback(async (
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
        }, [API_BASE_URL, getHeaders]);

    const applyWatermark = useCallback(async (
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
        }, [API_BASE_URL, getHeaders]);    const getMyToolResults = useCallback(async (toolName?: string, limit: number = 20, offset: number = 0, folderId?: string | null) => {
            const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
            if (toolName) params.append('tool_name', toolName);
            if (folderId) params.append('folder_id', folderId);
            
            const res = await fetch(`${API_BASE_URL}/tools/my-results?${params.toString()}`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch AI tool results');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const deleteToolResult = useCallback(async (resultId: string) => {
            const res = await fetch(`${API_BASE_URL}/tools/results/${resultId}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete AI tool result');
            // Returns 204 No Content, so no JSON parsing needed
            return true;
        }, [API_BASE_URL, getHeaders]);

    // --- Brand Kit API ---

    const generateProjectTitle = useCallback(async (prompt: string) => {
            const res = await fetch(`${API_BASE_URL}/designs/generate-title`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error('Failed to generate project title');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const redesignFromReference = useCallback(async (payload: Types.RedesignRequest): Promise<Types.DesignGenerationResponse> => {
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
        }, [API_BASE_URL, getHeaders]);

    return {
        generateDesign,
        redesignFromReference,
        clarifyCopywriting,
        clarifyUnified,
        generateCopywriting,
        parseDesignText,
        uploadImage,
        getJobStatus,
        getMyGenerations,
        deleteGeneration,
        createToolJob,
        createPipelineJob,
        executePipelinePreview,
        getToolJobStatus,
        cancelToolJob,
        getMyToolJobs,
        generateMagicTextLayout,
        removeBackground,
        upscaleImage,
        retouchImage,
        generateIdPhoto,
        magicEraser,
        backgroundSwap,
        suggestBackgrounds,
        productScene,
        preflightProductScene,
        batchProcess,
        applyWatermark,
        getMyToolResults,
        deleteToolResult,
        generateProjectTitle,
    };
}

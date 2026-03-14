import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ProjectPayload {
    id?: string;
    title: string;
    canvas_state: object;
    status: string;
    aspect_ratio?: string;
}

// --- History Types ---
export interface HistoryEntry {
    id: string;
    project_id: string;
    action_type: string;
    canvas_state?: Record<string, unknown>;
    prompt_used?: string;
    created_at: string;
}

// --- Brand Kit Types ---
export type ColorRole = 'background' | 'primary_text' | 'secondary_text' | 'accent' | 'primary' | 'secondary' | string;

export interface ColorSwatch {
    hex: string;
    name: string;
    role: ColorRole;
}

export interface Typography {
    primaryFont?: string;
    secondaryFont?: string;
}

export interface BrandKit {
    id: string;
    user_id: string;
    name: string;
    logo_url: string | null;
    logos: string[];
    colors: ColorSwatch[];
    typography?: Typography;
    is_active: boolean;
    created_at: string;
}

// Alias for semantic clarity in hooks and UI
export type BrandKitProfile = BrandKit;

// --- Credit History Types ---
export interface CreditTransaction {
    id: string;
    user_id: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
}

export interface CreditHistoryResponse {
    transactions: CreditTransaction[];
    total_count: number;
}

// --- Copywriting Types ---
export interface CopywritingVariation {
    style: string;
    headline: string;
    subline: string;
    cta: string;
    full_text: string;
}

export function useProjectApi() {
    const { data: session } = useSession();

    const getHeaders = useCallback((skipContentType: boolean = false): Record<string, string> => {
        const headers: Record<string, string> = {
            ...(skipContentType ? {} : { 'Content-Type': 'application/json' })
        };
        // @ts-expect-error - accessToken is extended on the session object
        const token = session?.accessToken;

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }, [session]);

    const getProject = async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch project');
        return res.json();
    };

    const saveProject = async (projectPayload: ProjectPayload) => {
        // If it has an ID, we update, else create. For our flow right now:
        // Actually our POST /api/projects creates. PUT /api/projects/:id updates.
        const method = projectPayload.id ? 'PUT' : 'POST';
        const url = projectPayload.id
            ? `${API_BASE_URL}/projects/${projectPayload.id}`
            : `${API_BASE_URL}/projects/`;

        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(projectPayload),
        });
        if (!res.ok) throw new Error('Failed to save project');
        return res.json();
    };

    const generateProjectTitle = async (prompt: string) => {
        const res = await fetch(`${API_BASE_URL}/designs/generate-title`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error('Failed to generate project title');
        return res.json();
    };

    const getProjects = async () => {
        const res = await fetch(`${API_BASE_URL}/projects/`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    };

    const deleteProject = async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to delete project');
    };

    const duplicateProject = async (sourceId: string) => {
        const source = await getProject(sourceId);
        return saveProject({
            title: `Copy of ${source.title || 'Untitled Design'}`,
            canvas_state: source.canvas_state,
            status: 'draft',
            aspect_ratio: source.aspect_ratio || '1:1',
        });
    };

    const getUserProfile = async () => {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch user profile');
        return res.json();
    };

    const updateProfile = async (name: string) => {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            // Pydantic validation errors come in errBody.detail as array
            const detail = Array.isArray(errBody.detail)
                ? errBody.detail.map((e: { msg?: string }) => e.msg).join(', ')
                : errBody.detail || 'Gagal memperbarui profil';
            throw new Error(detail);
        }
        return res.json();
    };

    const deleteAccount = async () => {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.detail || 'Gagal menghapus akun');
        }
    };

    const getCreditHistory = async (limit: number = 50, offset: number = 0): Promise<CreditHistoryResponse> => {
        const qs = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() }).toString();
        const res = await fetch(`${API_BASE_URL}/users/me/credits/history?${qs}`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.detail || 'Failed to fetch credit history');
        }
        return res.json();
    };

    const generateDesign = async (payload: {
        raw_text: string;
        aspect_ratio: string;
        style_preference: string;
        reference_image_url?: string;
        template_id?: string;
        integrated_text?: boolean;
        remove_product_bg?: boolean;
        product_image_url?: string;
        brand_kit_id?: string; // Added brand_kit_id
    }) => {
        const res = await fetch(`${API_BASE_URL}/designs/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to generate design');
        }
        return res.json();
    };

    const clarifyCopywriting = async (payload: {
        product_description: string;
    }) => {
        const res = await fetch(`${API_BASE_URL}/designs/clarify-copywriting`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to clarify copywriting');
        }
        return res.json();
    };

    const clarifyUnified = async (payload: {
        raw_text: string;
    }) => {
        const res = await fetch(`${API_BASE_URL}/designs/clarify-unified`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to generate unified clarification questions');
        }
        return res.json();
    };

    const generateCopywriting = async (payload: {
        product_description: string;
        tone?: string;
        brand_name?: string;
        clarification_answers?: Record<string, string>;
    }): Promise<{ variations: CopywritingVariation[] }> => {
        const res = await fetch(`${API_BASE_URL}/designs/generate-copywriting`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to generate copywriting');
        }
        return res.json();
    };

    const parseDesignText = async (payload: {
        raw_text: string;
        aspect_ratio?: string;
        style_preference?: string;
        num_variations?: number;
        integrated_text?: boolean;
        clarification_answers?: Record<string, string>;
    }) => {
        const res = await fetch(`${API_BASE_URL}/designs/parse`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to parse design text');
        }
        return res.json();
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
            throw new Error(errBase.detail || 'Failed to upload image');
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

    const getTemplates = async (category?: string, aspectRatio?: string) => {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (aspectRatio) params.set('aspect_ratio', aspectRatio);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/templates/${qs}`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
    };

    const getHistory = async (projectId: string) => {
        const res = await fetch(`${API_BASE_URL}/history/${projectId}`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
    };

    const createHistory = async (data: { project_id: string; background_url: string; text_layers: Record<string, unknown>; generation_params?: Record<string, unknown> }) => {
        const res = await fetch(`${API_BASE_URL}/history/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create history entry');
        return res.json();
    };

    const generateMagicTextLayout = async (payload: { image_base64: string; text: string; canvas_width?: number; canvas_height?: number; style_hint?: string }) => {
        const res = await fetch(`${API_BASE_URL}/designs/magic-text`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to generate magic text layout');
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
            throw new Error(errBase.detail || 'Failed to remove background');
        }
        return res.json(); // returns { url: string }
    };

    const upscaleImage = async (file: File, scale: number = 2.0): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('scale', scale.toString());

        const response = await fetch(`${API_BASE_URL}/api/tools/upscale`, {
            method: 'POST',
            headers: getHeaders(true), // true implies skipContentType
            body: formData,
        });
        if (!response.ok) {
            const errBase = await response.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to upscale image');
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

        const response = await fetch(`${API_BASE_URL}/api/tools/text-banner`, {
            method: 'POST',
            headers: getHeaders(true),
            body: formData,
        });
        
        if (!response.ok) {
            const errBase = await response.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to generate text banner');
        }
        return response.json();
    };



    // --- Brand Kit API ---
    const extractBrandColors = async (file: File): Promise<{ colors: ColorSwatch[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        // @ts-expect-error session token
        const token = session?.accessToken;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/brand-kits/extract`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error(errBase.detail || 'Failed to extract colors');
        }
        return res.json();
    };

    const saveBrandKit = async (data: Omit<BrandKitProfile, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<BrandKitProfile> => {
        console.log("saveBrandKit payload:", data);
        const res = await fetch(`${API_BASE_URL}/brand-kits`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        console.log("saveBrandKit raw response:", res);
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            console.error("saveBrandKit error response json:", errBase);
            throw new Error(errBase.detail || 'Failed to save Brand Kit');
        }
        return res.json();
    };

    const getBrandKits = async (): Promise<BrandKit[]> => {
        const res = await fetch(`${API_BASE_URL}/brand-kits`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch brand kits');
        return res.json();
    };

    const getActiveBrandKit = async (): Promise<BrandKit | null> => {
        const res = await fetch(`${API_BASE_URL}/brand-kits/active`, { headers: getHeaders() });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Failed to fetch active brand kit');
        return res.json();
    };

    const updateBrandKit = async (id: string, data: Partial<BrandKit>): Promise<BrandKit> => {
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

    return { 
        getProject, saveProject, getProjects, deleteProject, duplicateProject, 
        getUserProfile, updateProfile, deleteAccount, generateDesign, uploadImage, 
        getJobStatus, getMyGenerations, getTemplates, getHistory, createHistory, 
        generateMagicTextLayout, removeBackground,
        extractBrandColors, saveBrandKit, getBrandKits, getActiveBrandKit, updateBrandKit, deleteBrandKit,
        clarifyCopywriting, generateCopywriting, parseDesignText, clarifyUnified,
        upscaleImage,
        generateTextBanner,
        generateProjectTitle,
        getCreditHistory,
    };
}

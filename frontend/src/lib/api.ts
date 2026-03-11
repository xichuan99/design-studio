import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ProjectPayload {
    id?: string;
    title: string;
    canvas_state: object;
    status: string;
}

export function useProjectApi() {
    const { data: session } = useSession();

    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

    const generateDesign = async (payload: {
        raw_text: string;
        aspect_ratio: string;
        style_preference: string;
        reference_image_url?: string;
        template_id?: string;
        integrated_text?: boolean;
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

    return { getProject, saveProject, getProjects, deleteProject, getUserProfile, updateProfile, deleteAccount, generateDesign, uploadImage, getJobStatus, getMyGenerations, getTemplates, getHistory, createHistory };
}

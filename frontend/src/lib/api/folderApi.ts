import { useApiCore } from './coreApi';
import * as Types from './types';

export function useFolderEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const getFolders = async (parentId?: string) => {
        const params = new URLSearchParams();
        if (parentId !== undefined) {
             params.set('parent_id', parentId);
        }
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_BASE_URL}/folders/${qs}`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch folders');
        }
        return res.json() as Promise<Types.Folder[]>;
    };

    const getFolder = async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/folders/${id}`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch folder');
        }
        return res.json() as Promise<Types.Folder>;
    };

    const createFolder = async (data: Types.FolderCreate) => {
        const res = await fetch(`${API_BASE_URL}/folders/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to create folder');
        }
        return res.json() as Promise<Types.Folder>;
    };

    const updateFolder = async (id: string, data: Types.FolderUpdate) => {
        const res = await fetch(`${API_BASE_URL}/folders/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to update folder');
        }
        return res.json() as Promise<Types.Folder>;
    };

    const deleteFolder = async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/folders/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to delete folder');
        }
    };

    return { getFolders, getFolder, createFolder, updateFolder, deleteFolder };
}

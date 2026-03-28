import { useApiCore } from './coreApi';
import * as Types from './types';
import { useCallback } from 'react';

export function useFolderEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const getFolders = useCallback(async (parentId?: string) => {
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
    }, [API_BASE_URL, getHeaders]);

    const getFolder = useCallback(async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/folders/${id}`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch folder');
        }
        return res.json() as Promise<Types.Folder>;
    }, [API_BASE_URL, getHeaders]);

    const createFolder = useCallback(async (data: Types.FolderCreate) => {
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
    }, [API_BASE_URL, getHeaders]);

    const updateFolder = useCallback(async (id: string, data: Types.FolderUpdate) => {
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
    }, [API_BASE_URL, getHeaders]);

    const deleteFolder = useCallback(async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/folders/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to delete folder');
        }
    }, [API_BASE_URL, getHeaders]);

    return { getFolders, getFolder, createFolder, updateFolder, deleteFolder };
}

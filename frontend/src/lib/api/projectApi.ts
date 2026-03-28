import { useApiCore } from './coreApi';
import * as Types from './types';
import { buildVersionedCanvasPayload } from '../canvasPersistence';
import { useCallback } from 'react';

export function useProjectEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const getProject = useCallback(async (id: string) => {
            const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch project');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const saveProject = useCallback(async (projectPayload: Types.ProjectPayload) => {
            // If it has an ID, we update, else create. For our flow right now:
            // Actually our POST /api/projects creates. PUT /api/projects/:id updates.
            const method = projectPayload.id ? 'PUT' : 'POST';
            const url = projectPayload.id
                ? `${API_BASE_URL}/projects/${projectPayload.id}`
                : `${API_BASE_URL}/projects/`;
    
            const versionedCanvas = buildVersionedCanvasPayload(
                projectPayload.canvas_state as Record<string, unknown>,
                projectPayload.canvas_schema_version
            );

            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify({
                    ...projectPayload,
                    ...versionedCanvas,
                }),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to save project');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getProjects = useCallback(async (folderId?: string) => {
            const params = new URLSearchParams();
            if (folderId !== undefined) {
                 params.set('folder_id', folderId);
            }
            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/projects/${qs}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch projects');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const deleteProject = useCallback(async (id: string) => {
            const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to delete project');
            }
        }, [API_BASE_URL, getHeaders]);

    const duplicateProject = useCallback(async (sourceId: string) => {
            const source = await getProject(sourceId);
            return saveProject({
                title: `Copy of ${source.title || 'Untitled Design'}`,
                canvas_state: source.canvas_state,
                canvas_schema_version: source.canvas_schema_version,
                status: 'draft',
                aspect_ratio: source.aspect_ratio || '1:1',
            });
        }, [getProject, saveProject]);

    const getHistory = useCallback(async (projectId: string) => {
            const res = await fetch(`${API_BASE_URL}/history/${projectId}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch history');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const createHistory = useCallback(async (data: Types.HistoryCreateRequest) => {
            const res = await fetch(`${API_BASE_URL}/history/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    ...data,
                    canvas_schema_version: data.canvas_schema_version ?? 1,
                }),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to create history entry');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getTemplates = useCallback(async (category?: string, aspectRatio?: string) => {
            const params = new URLSearchParams();
            if (category) params.set('category', category);
            if (aspectRatio) params.set('aspect_ratio', aspectRatio);
            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/templates/${qs}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBase = await res.json().catch(() => ({}));
                throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch templates');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getProjectVersions = useCallback(async (projectId: string): Promise<Types.ProjectVersionResponse[]> => {
        const res = await fetch(`${API_BASE_URL}/projects/${projectId}/versions`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to fetch project versions');
        }
        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const createProjectVersion = useCallback(async (projectId: string, data: Types.ProjectVersionCreate): Promise<Types.ProjectVersionResponse> => {
        const res = await fetch(`${API_BASE_URL}/projects/${projectId}/versions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to create project version');
        }
        return res.json();
    }, [API_BASE_URL, getHeaders]);

    const deleteProjectVersion = useCallback(async (projectId: string, versionId: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/projects/${projectId}/versions/${versionId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errBase = await res.json().catch(() => ({}));
            throw new Error((errBase?.error?.detail || errBase?.detail) || 'Failed to delete project version');
        }
    }, [API_BASE_URL, getHeaders]);

    return { getProject, saveProject, getProjects, deleteProject, duplicateProject, getHistory, createHistory, getTemplates, getProjectVersions, createProjectVersion, deleteProjectVersion };
}

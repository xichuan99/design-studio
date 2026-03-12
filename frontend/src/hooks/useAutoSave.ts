import { useState, useEffect, useCallback } from 'react';
import { useCanvasStore, CanvasElement } from '@/store/useCanvasStore';
import { useSession } from 'next-auth/react';
import { API_BASE_URL } from '@/lib/api';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

/** Fields that matter for saving — ignore UI-only state like selectedElementId, stageRef */
interface SaveableState {
    elements: CanvasElement[];
    backgroundUrl: string | null;
    backgroundColor: string;
    projectTitle: string;
}

function getSaveableState(): SaveableState {
    const s = useCanvasStore.getState();
    return {
        elements: s.elements,
        backgroundUrl: s.backgroundUrl,
        backgroundColor: s.backgroundColor,
        projectTitle: s.projectTitle,
    };
}

/**
 * Auto-save hook that debounces canvas state changes and saves to the API.
 * Only watches saveable fields (elements, background, title) — ignores
 * selectedElementId, stageRef, historyIndex to avoid spurious triggers.
 */
export function useAutoSave(projectId?: string | null) {
    const { data: session } = useSession();
    const [status, setStatus] = useState<SaveStatus>('idle');

    const performSave = useCallback(async () => {
        if (!projectId) return;

        // @ts-expect-error - accessToken is extended on the session object
        const token = session?.accessToken;

        const state = useCanvasStore.getState();
        const payload = {
            id: projectId,
            title: state.projectTitle || 'Untitled Design',
            canvas_state: {
                elements: state.elements,
                backgroundUrl: state.backgroundUrl,
                backgroundColor: state.backgroundColor,
            },
            status: 'draft',
        };

        try {
            setStatus('saving');

            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Save failed');

            setStatus('saved');

            setTimeout(() => {
                setStatus((current) => current === 'saved' ? 'idle' : current);
            }, 3000);
        } catch (err) {
            console.error('Auto-save failed:', err);
            setStatus('error');
        }
    }, [projectId, session]);

    // Subscribe to store changes, but only react to saveable fields
    useEffect(() => {
        if (!projectId) return;

        let debounceTimer: NodeJS.Timeout | null = null;
        let isFirstChange = true;
        let hasUnsaved = false;
        let lastSnapshot = JSON.stringify(getSaveableState());

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsaved) {
                event.returnValue = 'You have unsaved changes.';
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                    debounceTimer = null;
                }
                // Try to perform a synchronous-like save before closing
                // Modern browsers might still cancel this, but it's better than dropping it completely.
                performSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        const unsubscribe = useCanvasStore.subscribe(() => {
            const currentSnapshot = JSON.stringify(getSaveableState());

            // Skip if saveable state hasn't actually changed
            if (currentSnapshot === lastSnapshot) return;
            lastSnapshot = currentSnapshot;

            if (isFirstChange) {
                isFirstChange = false;
                return;
            }

            hasUnsaved = true;
            setStatus('unsaved');

            if (debounceTimer) clearTimeout(debounceTimer);

            debounceTimer = setTimeout(() => {
                hasUnsaved = false;
                performSave();
            }, 5000);
        });

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [projectId, performSave]);

    return {
        saveStatus: status,
        forceSave: performSave,
    };
}

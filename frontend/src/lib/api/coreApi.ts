import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export function useApiCore() {
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

    return { API_BASE_URL, getHeaders, session };
}

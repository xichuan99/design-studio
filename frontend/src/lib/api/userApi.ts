import { useApiCore } from './coreApi';
import * as Types from './types';
import { useCallback } from 'react';

export function useUserEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

    const getUserProfile = useCallback(async (): Promise<Types.UserResponse> => {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch user profile');
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const updateProfile = useCallback(async (name: string): Promise<Types.UserResponse> => {
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
        }, [API_BASE_URL, getHeaders]);

    const deleteAccount = useCallback(async (): Promise<void> => {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Gagal menghapus akun');
            }
        }, [API_BASE_URL, getHeaders]);

    const getCreditHistory = useCallback(async (limit: number = 50, offset: number = 0): Promise<Types.CreditHistoryResponse> => {
            const qs = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() }).toString();
            const res = await fetch(`${API_BASE_URL}/users/me/credits/history?${qs}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to fetch credit history');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getStorageUsage = useCallback(async (): Promise<Types.StorageUsage> => {
            const res = await fetch(`${API_BASE_URL}/users/me/storage`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to fetch storage usage');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const getStorageAddons = useCallback(async (): Promise<Types.StorageAddonListResponse> => {
            const res = await fetch(`${API_BASE_URL}/users/me/storage/addons`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to fetch storage addon catalog');
            }
            return res.json();
        }, [API_BASE_URL, getHeaders]);

    const createStoragePurchaseIntent = useCallback(
        async (payload: Types.StoragePurchaseIntentRequest): Promise<Types.StoragePurchaseIntentResponse> => {
            const res = await fetch(`${API_BASE_URL}/users/me/storage/purchase-intent`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to create storage purchase intent');
            }
            return res.json();
        },
        [API_BASE_URL, getHeaders]
    );

    const getStoragePurchases = useCallback(
        async (limit: number = 20, offset: number = 0): Promise<Types.StoragePurchaseListResponse> => {
            const qs = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
            }).toString();

            const res = await fetch(`${API_BASE_URL}/users/me/storage/purchases?${qs}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to fetch storage purchases');
            }
            return res.json();
        },
        [API_BASE_URL, getHeaders]
    );

    return {
        getUserProfile,
        updateProfile,
        deleteAccount,
        getCreditHistory,
        getStorageUsage,
        getStorageAddons,
        createStoragePurchaseIntent,
        getStoragePurchases,
    };
}

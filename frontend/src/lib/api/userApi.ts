import { useApiCore } from './coreApi';
import * as Types from './types';

export function useUserEndpoints() {
    const { API_BASE_URL, getHeaders } = useApiCore();

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

    const getCreditHistory = async (limit: number = 50, offset: number = 0): Promise<Types.CreditHistoryResponse> => {
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

    const getStorageUsage = async (): Promise<Types.StorageUsage> => {
            const res = await fetch(`${API_BASE_URL}/users/me/storage`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to fetch storage usage');
            }
            return res.json();
        };

    return { getUserProfile, updateProfile, deleteAccount, getCreditHistory, getStorageUsage };
}

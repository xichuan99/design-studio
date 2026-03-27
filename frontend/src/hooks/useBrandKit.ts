import { useState, useEffect, useCallback } from 'react';
import { BrandKitProfile, useProjectApi } from '@/lib/api';

export function useBrandKit(folderId?: string) {
    const api = useProjectApi();
    const [brandKits, setBrandKits] = useState<BrandKitProfile[]>([]);
    const [activeBrandProfile, setActiveBrandProfile] = useState<BrandKitProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBrandKits = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getBrandKits(folderId);
            setBrandKits(data);
            
            // Set the active profile
            const active = data.find((kit: BrandKitProfile) => kit.is_active);
            setActiveBrandProfile(active || null);
        } catch (error) {
            console.error("Error fetching brand kits:", error);
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderId]);

    useEffect(() => {
        fetchBrandKits();
    }, [fetchBrandKits]);

    const switchBrand = async (brandId: string) => {
        try {
            // Optimistic update
            setBrandKits(currentKits => 
                currentKits.map(kit => ({
                    ...kit,
                    is_active: kit.id === brandId
                }))
            );
            
            const newlyActive = brandKits.find(kit => kit.id === brandId);
            if (newlyActive) {
                setActiveBrandProfile({...newlyActive, is_active: true});
            }

            // Sync with backend
            await api.updateBrandKit(brandId, { is_active: true });
            return true;
        } catch (error) {
            console.error("Error switching brand:", error);
            fetchBrandKits(); // Revert on failure
            return false;
        }
    };

    return {
        brandKits,
        activeBrandProfile,
        isLoading,
        switchBrand,
        refreshKits: fetchBrandKits
    };
}

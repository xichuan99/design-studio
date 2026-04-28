export * from './types';
export * from './coreApi';
import { useProjectEndpoints } from './projectApi';
import { useUserEndpoints } from './userApi';
import { useAiToolsEndpoints } from './aiToolsApi';
import { useBrandKitEndpoints } from './brandKitApi';
import { useCatalogEndpoints } from './catalogApi';
import { useFolderEndpoints } from './folderApi';

export function useProjectApi() {
    const project = useProjectEndpoints();
    const user = useUserEndpoints();
    const aiTools = useAiToolsEndpoints();
    const brandKit = useBrandKitEndpoints();
    const catalog = useCatalogEndpoints();
    const folder = useFolderEndpoints();

    return {
        ...project,
        ...user,
        ...aiTools,
        ...brandKit,
        ...catalog,
        ...folder
    };
}

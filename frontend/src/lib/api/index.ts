export * from './types';
export * from './coreApi';
import { useProjectEndpoints } from './projectApi';
import { useUserEndpoints } from './userApi';
import { useAiToolsEndpoints } from './aiToolsApi';
import { useBrandKitEndpoints } from './brandKitApi';

export function useProjectApi() {
    const project = useProjectEndpoints();
    const user = useUserEndpoints();
    const aiTools = useAiToolsEndpoints();
    const brandKit = useBrandKitEndpoints();

    return {
        ...project,
        ...user,
        ...aiTools,
        ...brandKit
    };
}

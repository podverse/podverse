import { canReadStorage } from '../managementPermissions';
import { ManagementApiRequestService } from '../requests/apiRequestService';
import type { CurrentUser } from '../requests/auth';

/**
 * Server-only probe for dashboard nav: true when the API reports bucket storage is enabled
 * and the admin may read bucket storage. Treats errors and `enabled: false` as false.
 */
export async function fetchBucketStorageEnabledForDashboard(
  token: string,
  user: CurrentUser
): Promise<boolean> {
  if (!canReadStorage(user)) {
    return false;
  }
  const service = new ManagementApiRequestService(token);
  try {
    const res = await service.apiRequest<{ enabled: boolean }>({
      path: '/storage',
      method: 'GET',
    });
    return res.enabled === true;
  } catch {
    return false;
  }
}

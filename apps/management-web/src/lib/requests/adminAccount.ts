import type { AdminAccount } from './admins';
import { ManagementApiRequestService } from './apiRequestService';

export async function getAdminAccountById(id: number, jwt?: string): Promise<AdminAccount> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminAccount>({
    path: `/admins/${id}`,
    method: 'GET',
  });
}

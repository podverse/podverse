import { ManagementApiRequestService } from './apiRequestService';

export type AdminAccount = {
  id: number;
  id_text: string;
  created_at: string;
};

export async function getAdminAccountById(id: number, jwt?: string): Promise<AdminAccount> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminAccount>({
    path: `/admin-account/${id}`,
    method: 'GET',
  });
}

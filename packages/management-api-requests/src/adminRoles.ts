import { ManagementApiRequestService } from './apiRequestService.js';

export type ManagementAdminRoleItem = {
  id: string;
  name_key: string | null;
  name: string | null;
  is_predefined: boolean;
  feeds_crud: number;
  feed_takedown_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
  billing_prices_crud: number;
  bucket_crud: number;
  embed_demo_crud: number;
  created_at: string | null;
};

export type CreateManagementAdminRoleParams = {
  name: string;
  feeds_crud: number;
  feed_takedown_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
  billing_prices_crud: number;
  bucket_crud: number;
  embed_demo_crud: number;
};

export async function listManagementAdminRoles(
  jwt?: string
): Promise<{ roles: ManagementAdminRoleItem[] }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ roles: ManagementAdminRoleItem[] }>({
    path: '/admins/roles',
    method: 'GET',
  });
}

export async function createManagementAdminRole(
  params: CreateManagementAdminRoleParams,
  jwt?: string
): Promise<{ role: ManagementAdminRoleItem }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ role: ManagementAdminRoleItem }>({
    path: '/admins/roles',
    method: 'POST',
    data: params,
  });
}

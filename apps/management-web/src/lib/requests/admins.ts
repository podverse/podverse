import { ManagementApiRequestService } from './apiRequestService';
import type { CrudPermissions } from './auth';

export type AdminAccount = {
  id: number;
  id_text: string;
  role: string;
  email: string | null;
  permissions: CrudPermissions | null;
  created_at: string;
};

export async function getAdminAccountById(id: number, jwt?: string): Promise<AdminAccount> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminAccount>({
    path: `/admins/${id}`,
    method: 'GET',
  });
}

export async function listAdmins(jwt?: string): Promise<AdminAccount[]> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminAccount[]>({
    path: '/admins',
    method: 'GET',
  });
}

type CreateAdminParams = {
  email: string;
  password: string;
  permissions?: Partial<CrudPermissions>;
};

export async function createAdmin(params: CreateAdminParams, jwt?: string): Promise<AdminAccount> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminAccount>({
    path: '/admins',
    method: 'POST',
    data: params,
  });
}

type UpdateAdminParams = {
  email?: string;
  password?: string;
  permissions?: Partial<CrudPermissions>;
};

export async function updateAdmin(
  id: number,
  params: UpdateAdminParams,
  jwt?: string
): Promise<AdminAccount> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminAccount>({
    path: `/admins/${id}`,
    method: 'PATCH',
    data: params,
  });
}

export async function deleteAdmin(id: number, jwt?: string): Promise<void> {
  const service = new ManagementApiRequestService(jwt);
  await service.apiRequest<void>({
    path: `/admins/${id}`,
    method: 'DELETE',
  });
}

import { ManagementApiRequestService } from './apiRequestService';
import type { CrudPermissions } from './auth';

export type AdminAccount = {
  id: number;
  id_text: string;
  role: string;
  email: string | null;
  username: string | null;
  permissions: CrudPermissions | null;
  created_at: string;
};

export type AdminInviteLink = {
  url: string;
  expires_at: string;
  is_expired: boolean;
};

export type AdminInviteLinkResponse = {
  invite_link: AdminInviteLink | null;
};

export type GenerateAdminInviteLinkResponse = {
  invite_link: AdminInviteLink;
};

export type CreateAdminParams = {
  email?: string;
  username?: string;
  password?: string;
  permissions?: Partial<CrudPermissions>;
};

export type CreateAdminResponse = AdminAccount & {
  message?: string;
  set_password_url?: string;
  invite_link?: AdminInviteLink;
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

export async function createAdmin(
  params: CreateAdminParams,
  jwt?: string
): Promise<CreateAdminResponse> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<CreateAdminResponse>({
    path: '/admins',
    method: 'POST',
    data: params,
  });
}

export type UpdateAdminParams = {
  email?: string;
  username?: string;
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

export async function getAdminInviteLink(
  id: number,
  jwt?: string
): Promise<AdminInviteLinkResponse> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<AdminInviteLinkResponse>({
    path: `/admins/${id}/invite-link`,
    method: 'GET',
  });
}

export async function generateAdminInviteLink(
  id: number,
  jwt?: string
): Promise<GenerateAdminInviteLinkResponse> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<GenerateAdminInviteLinkResponse>({
    path: `/admins/${id}/invite-link`,
    method: 'POST',
  });
}

export async function revokeAdminInviteLink(
  id: number,
  jwt?: string
): Promise<{ message: string }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ message: string }>({
    path: `/admins/${id}/invite-link`,
    method: 'DELETE',
  });
}

export async function redeemAdminInviteLink(params: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<{ message: string }>({
    path: '/admins/invite-link/redeem',
    method: 'POST',
    data: params,
  });
}

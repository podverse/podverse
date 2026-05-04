import { ManagementApiRequestService } from './apiRequestService';

export type CreateUserParams = {
  username?: string;
  email?: string;
  password?: string;
  account_membership_id?: number;
  membership_expires_at?: string | null;
  account_trust_tier_id?: number;
  allow_directory_add_by_rss?: boolean | null;
  max_add_by_rss_feeds?: number | null;
  max_manual_refreshes_per_hour?: number | null;
  track_stats?: boolean | null;
  allow_notifications?: boolean | null;
};

export type CreateUserResponse = {
  message: string;
  set_password_url?: string;
};

export type User = {
  id: number;
  id_text: string;
  verified: boolean;
  email: string | null;
  username: string | null;
  sharable_status_id: number;
  created_at: string;
  account_membership_id: number;
  membership_expires_at: string | null;
  account_trust_tier_id: number;
  allow_directory_add_by_rss: boolean | null;
  max_add_by_rss_feeds: number | null;
  max_manual_refreshes_per_hour: number | null;
  track_stats: boolean | null;
  allow_notifications: boolean | null;
};

export type ListUsersResponse = {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type UpdateUserParams = {
  email?: string;
  username?: string;
  verified?: boolean;
  account_membership_id?: number;
  membership_expires_at?: string | null;
  account_trust_tier_id?: number;
  allow_directory_add_by_rss?: boolean | null;
  max_add_by_rss_feeds?: number | null;
  max_manual_refreshes_per_hour?: number | null;
  track_stats?: boolean | null;
  allow_notifications?: boolean | null;
};

export async function createUser(
  params: CreateUserParams,
  jwt?: string
): Promise<CreateUserResponse> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<CreateUserResponse>({
    path: '/users',
    method: 'POST',
    data: params,
  });
}

export async function listUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  jwt?: string;
}): Promise<ListUsersResponse> {
  const service = new ManagementApiRequestService(params?.jwt);
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.search) queryParams.search = params.search;

  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const path = `/users${queryString ? `?${queryString}` : ''}`;

  return service.apiRequest<ListUsersResponse>({ path });
}

export async function getUser(id: number, jwt?: string): Promise<{ user: User }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ user: User }>({ path: `/users/${id}` });
}

export async function updateUser(
  id: number,
  params: UpdateUserParams,
  jwt?: string
): Promise<{ user: User }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ user: User }>({
    path: `/users/${id}`,
    method: 'PATCH',
    data: params,
  });
}

export async function deleteUser(id: number, jwt?: string): Promise<{ message: string }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ message: string }>({
    path: `/users/${id}`,
    method: 'DELETE',
  });
}

export async function changeUserPassword(
  id: number,
  password: string,
  jwt?: string
): Promise<{ message: string }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ message: string }>({
    path: `/users/${id}/change-password`,
    method: 'POST',
    data: { password },
  });
}

export type InviteLink = {
  url: string;
  expires_at: string;
  is_expired: boolean;
};

export async function getInviteLink(
  id: number,
  jwt?: string
): Promise<{ invite_link: InviteLink | null }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ invite_link: InviteLink | null }>({
    path: `/users/${id}/invite-link`,
  });
}

export async function generateInviteLink(
  id: number,
  jwt?: string
): Promise<{ invite_link: InviteLink }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ invite_link: InviteLink }>({
    path: `/users/${id}/invite-link`,
    method: 'POST',
  });
}

export async function revokeInviteLink(id: number, jwt?: string): Promise<{ message: string }> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<{ message: string }>({
    path: `/users/${id}/invite-link`,
    method: 'DELETE',
  });
}

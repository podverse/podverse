import { ManagementApiRequestService } from './apiRequestService.js';

export type LoginParams = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  token?: string;
};

export type CrudPermissions = {
  feeds_crud: number;
  feed_takedown_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
  billing_prices_crud: number;
  bucket_crud: number;
  embed_demo_crud: number;
  notifications_crud?: number;
};

export type CurrentUser = {
  id: number;
  id_text: string;
  email: string | null;
  username: string | null;
  role: string;
  permissions: CrudPermissions | null;
};

export async function login(params: LoginParams): Promise<LoginResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<LoginResponse>({
    path: '/auth/login',
    method: 'POST',
    data: params,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const service = new ManagementApiRequestService();
    return await service.apiRequest<CurrentUser>({
      path: '/auth/me',
      method: 'GET',
    });
  } catch (error) {
    const isUnauthorized =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 401;

    if (!isUnauthorized) {
      console.error('Error getting current user:', error);
    }
    return null;
  }
}

export type MobileTokenResponse = {
  token_type: 'Bearer';
  access_token: string;
  access_token_expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
};

export async function mobileToken(params: LoginParams): Promise<MobileTokenResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<MobileTokenResponse>({
    path: '/auth/mobile/token',
    method: 'POST',
    data: params,
  });
}

export async function mobileRefresh(refresh_token: string): Promise<MobileTokenResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<MobileTokenResponse>({
    path: '/auth/mobile/refresh',
    method: 'POST',
    data: { refresh_token },
  });
}

export async function mobileRevoke(refresh_token: string): Promise<{ message: string }> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<{ message: string }>({
    path: '/auth/mobile/revoke',
    method: 'POST',
    data: { refresh_token },
  });
}

import { ManagementApiRequestService } from './apiRequestService';

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
  billing_prices_crud?: number;
};

export type CurrentUser = {
  id: number;
  id_text: string;
  email: string;
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

import { ManagementApiRequestService } from './apiRequestService';

export type LoginParams = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  token?: string;
};

export type CurrentUser = {
  id: number;
  id_text: string;
  created_at: string;
};

export async function login(
  params: LoginParams,
): Promise<LoginResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<LoginResponse>({
    path: '/auth/login',
    method: 'POST',
    data: params,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    // Don't read the HTTP-only cookie - it's not accessible via JavaScript
    // The browser will send it automatically with withCredentials: true
    const service = new ManagementApiRequestService();
    return await service.apiRequest<CurrentUser>({
      path: '/auth/me',
      method: 'GET',
    });
  } catch (error) {
    // 401 is expected when user is not logged in - don't log as error
    const isUnauthorized = error && typeof error === 'object' && 'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 401;
    
    if (!isUnauthorized) {
      console.error('Error getting current user:', error);
    }
    return null;
  }
}

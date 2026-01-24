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
    return service.apiRequest<CurrentUser>({
      path: '/auth/me',
      method: 'GET',
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

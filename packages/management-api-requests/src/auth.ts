import { ManagementApiRequestService } from './apiRequestService.js';

export type LoginParams = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message?: string;
  token?: string;
  step?: 'setup' | 'code';
  setupToken?: string;
  challengeToken?: string;
  backupCodes?: string[];
  qrDataUrl?: string;
  manualKey?: string;
  challenge?: 'expired';
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
  billing_channels_crud?: number;
  billing_processor_products_crud?: number;
  billing_account_crud?: number;
  billing_webhook_events_crud?: number;
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

async function postAuth(path: string, data?: object): Promise<LoginResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<LoginResponse>({
    path,
    method: 'POST',
    ...(data === undefined ? {} : { data }),
  });
}

export function secondFactorCode(params: { challengeToken: string; code: string }) {
  return postAuth('/auth/second-factor/code', params);
}

export function secondFactorEmail(params: { challengeToken: string }) {
  return postAuth('/auth/second-factor/email', params);
}

export function secondFactorSetup(params: { setupToken: string }) {
  return postAuth('/auth/second-factor/setup', params);
}

export function secondFactorSetupConfirm(params: { setupToken: string; code: string }) {
  return postAuth('/auth/second-factor/setup/confirm', params);
}

export type SecondFactorStatus = {
  mode: 'optional' | 'required';
  enrolled: boolean;
  backupCodesRemaining: number;
};

export async function secondFactorStatus(): Promise<SecondFactorStatus> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<SecondFactorStatus>({
    path: '/auth/second-factor',
    method: 'GET',
  });
}

export function secondFactorEnroll() {
  return postAuth('/auth/second-factor/enroll');
}

export function secondFactorEnrollConfirm(params: { code: string }) {
  return postAuth('/auth/second-factor/enroll/confirm', params);
}

export function secondFactorDisable(params: { password: string; code: string }) {
  return postAuth('/auth/second-factor/disable', params);
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

export type MobileTokenParams = LoginParams & {
  /** Shown in the admin's session list; the API falls back to the client platform header. */
  device_label?: string;
};

export async function mobileToken(params: MobileTokenParams): Promise<MobileTokenResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<MobileTokenResponse>({
    path: '/auth/mobile/token',
    method: 'POST',
    data: {
      email: params.email,
      password: params.password,
      ...(params.device_label !== undefined && params.device_label !== ''
        ? { device_label: params.device_label }
        : {}),
    },
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

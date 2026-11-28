import type { DTOAccount } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiMessageResponse } from '../_response.js';

type ReqAuthLoginParams = {
  email: string;
  password: string;
  includeTokenInResponseBody?: boolean;
};

export type AuthLoginResponse = ApiMessageResponse & {
  token?: string;
  step?: 'setup' | 'code';
  setupToken?: string;
  challengeToken?: string;
  backupCodes?: string[];
  qrDataUrl?: string;
  manualKey?: string;
  challenge?: 'expired';
};

export type MobileTokenResponse = {
  token_type?: 'Bearer';
  access_token?: string;
  access_token_expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  step?: 'setup' | 'code';
  setupToken?: string;
  challengeToken?: string;
  backupCodes?: string[];
  qrDataUrl?: string;
  manualKey?: string;
  challenge?: 'expired';
};

export async function reqAuthLogin(api: ApiRequestService, params: ReqAuthLoginParams) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/login',
    method: 'POST',
    data: {
      email: params.email,
      password: params.password,
      includeTokenInResponseBody: params.includeTokenInResponseBody ?? false,
    },
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorCode(
  api: ApiRequestService,
  params: { challengeToken: string; code: string }
) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/second-factor/code',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorEmail(
  api: ApiRequestService,
  params: { challengeToken: string }
) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/auth/second-factor/email',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorSetup(
  api: ApiRequestService,
  params: { setupToken: string }
) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/second-factor/setup',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorSetupConfirm(
  api: ApiRequestService,
  params: { setupToken: string; code: string }
) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/second-factor/setup/confirm',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export type SecondFactorStatusResponse = {
  mode: 'optional' | 'required';
  enrolled: boolean;
  backupCodesRemaining: number;
};

export async function reqAuthSecondFactorStatus(api: ApiRequestService) {
  return api.apiRequest<SecondFactorStatusResponse>({
    path: '/auth/second-factor',
    method: 'GET',
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorEnroll(api: ApiRequestService) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/second-factor/enroll',
    method: 'POST',
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorEnrollConfirm(
  api: ApiRequestService,
  params: { code: string }
) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/second-factor/enroll/confirm',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorDisable(
  api: ApiRequestService,
  params: { password: string; code: string }
) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/auth/second-factor/disable',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAuthSecondFactorBackupCodes(
  api: ApiRequestService,
  params: { code: string }
) {
  return api.apiRequest<AuthLoginResponse>({
    path: '/auth/second-factor/backup-codes',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAuthLogout(api: ApiRequestService) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/auth/logout',
    method: 'POST',
    config: { withCredentials: true },
  });
}

export async function reqAuthMe(
  api: ApiRequestService,
  options?: { headers?: Record<string, string> }
) {
  return api.apiRequest<DTOAccount>({
    path: '/auth/me',
    method: 'GET',
    config: {
      withCredentials: true,
      ...(options?.headers ? { headers: options.headers } : {}),
    },
  });
}

export async function reqAuthCheckSession(
  api: ApiRequestService,
  options?: { headers?: Record<string, string> }
) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/auth/check-session',
    method: 'GET',
    config: {
      withCredentials: true,
      ...(options?.headers ? { headers: options.headers } : {}),
    },
  });
}

export type ReqAuthMobileTokenParams = {
  email: string;
  password: string;
  /** Shown in the account's session list; the API falls back to the client platform header. */
  device_label?: string;
};

export async function reqAuthMobileToken(api: ApiRequestService, params: ReqAuthMobileTokenParams) {
  return api.apiRequest<MobileTokenResponse>({
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

export async function reqAuthMobileRefresh(api: ApiRequestService, refresh_token: string) {
  return api.apiRequest<MobileTokenResponse>({
    path: '/auth/mobile/refresh',
    method: 'POST',
    data: { refresh_token },
  });
}

export async function reqAuthMobileRevoke(api: ApiRequestService, refresh_token: string) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/auth/mobile/revoke',
    method: 'POST',
    data: { refresh_token },
  });
}

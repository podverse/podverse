import type { DTOAccount } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiMessageResponse } from '../_response.js';

type ReqAuthLoginParams = {
  email: string;
  password: string;
  includeTokenInResponseBody?: boolean;
};

type AuthLoginResponse = ApiMessageResponse & {
  token?: string;
};

export type MobileTokenResponse = {
  token_type: 'Bearer';
  access_token: string;
  access_token_expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
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

export async function reqAuthMobileToken(api: ApiRequestService, params: ReqAuthLoginParams) {
  return api.apiRequest<MobileTokenResponse>({
    path: '/auth/mobile/token',
    method: 'POST',
    data: {
      email: params.email,
      password: params.password,
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

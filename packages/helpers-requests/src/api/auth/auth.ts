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

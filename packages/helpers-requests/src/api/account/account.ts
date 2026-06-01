import type { DTOAccount } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';
import type {
  QueryParamsAccountGlobalTop,
  QueryParamsAccountSubscribedTop,
  QueryParamsPage,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '../queryParams.js';

export async function reqAccountGetManyPublicRecent(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOAccount>> {
  return api.apiRequest<ApiListResponse<DTOAccount>>({
    path: '/account/recent',
    method: 'GET',
    config: { params },
  });
}

export async function reqAccountGetManySubscribedAZ(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOAccount>> {
  return api.apiRequest<ApiListResponse<DTOAccount>>({
    path: '/account/subscribed/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqAccountGetManySubscribedRecent(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOAccount>> {
  return api.apiRequest<ApiListResponse<DTOAccount>>({
    path: '/account/subscribed/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqAccountGetByIdText(
  api: ApiRequestService,
  params: { id_text: string }
): Promise<DTOAccount> {
  return api.apiRequest<DTOAccount>({
    path: `/account/${params.id_text}`,
    method: 'GET',
  });
}

export async function reqAccountCreate(
  api: ApiRequestService,
  params: {
    email: string;
    password: string;
    locale: string;
    terms_version: string;
    allow_listen_stats?: boolean;
  }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account',
    method: 'POST',
    data: params,
  });
}

export async function reqAccountAcceptTerms(
  api: ApiRequestService,
  params: { terms_version: string }
): Promise<{
  data: {
    terms_version: string;
    accepted_at: string;
  };
}> {
  return api.apiRequest({
    path: '/account/accept-terms',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountSendVerificationEmail(
  api: ApiRequestService,
  params: { email: string }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/send-verification-email',
    method: 'POST',
    data: params,
  });
}

export async function reqAccountVerifyEmail(
  api: ApiRequestService,
  params: { token: string }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/verify-email',
    method: 'POST',
    data: params,
  });
}

export async function reqAccountSendResetPasswordEmail(
  api: ApiRequestService,
  params: { email: string }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/send-reset-password-email',
    method: 'POST',
    data: params,
  });
}

export async function reqAccountResetPassword(
  api: ApiRequestService,
  params: { token: string; password: string }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/reset-password',
    method: 'POST',
    data: params,
  });
}

export async function reqAccountSendChangeEmailAddressEmail(
  api: ApiRequestService,
  params: { new_email: string }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/send-change-email-address-email',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountChangeEmailAddress(
  api: ApiRequestService,
  params: { token: string }
): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/verify-email-change',
    method: 'POST',
    data: params,
  });
}

export async function reqAccountUpdate(
  api: ApiRequestService,
  params: {
    display_name: string | null;
    bio: string | null;
    sharable_status: number;
    locale: string;
  }
): Promise<DTOAccount> {
  return api.apiRequest<DTOAccount>({
    path: '/account',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountDelete(api: ApiRequestService): Promise<{ message: string }> {
  return api.apiRequest<{ message: string }>({
    path: '/account/delete',
    method: 'DELETE',
    config: { withCredentials: true },
  });
}

export async function reqAccountDownloadData(api: ApiRequestService): Promise<Blob> {
  const result = await api.apiRequest<Blob>({
    path: '/account/download-data',
    method: 'GET',
    config: {
      withCredentials: true,
      responseType: 'blob',
    },
  });

  return result;
}

export async function reqAccountGetManyPublicTop(
  api: ApiRequestService,
  params: QueryParamsAccountGlobalTop
): Promise<ApiListResponse<DTOAccount>> {
  return api.apiRequest<ApiListResponse<DTOAccount>>({
    path: '/account/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqAccountGetManySubscribedTop(
  api: ApiRequestService,
  params: QueryParamsAccountSubscribedTop
): Promise<ApiListResponse<DTOAccount>> {
  return api.apiRequest<ApiListResponse<DTOAccount>>({
    path: '/account/subscribed/top',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export type QueryParamsGetManyProfiles = {
  type: QueryParamsSubscribedType | null;
  sort: QueryParamsSubscribedFullSort | null;
  range: QueryParamsStatsRange | null;
  page: number;
};

const emptyApiListResponse = {
  data: [],
  meta: {
    page: 1,
    count: 0,
    limit: 50,
  },
} as ApiListResponse<DTOAccount>;

export async function reqAccountGetMany(
  api: ApiRequestService,
  params: QueryParamsGetManyProfiles
): Promise<ApiListResponse<DTOAccount>> {
  const { type, sort, range, page } = params;

  if (type === 'global') {
    if (sort === 'top' && range) {
      return reqAccountGetManyPublicTop(api, {
        page,
        range,
      });
    } else {
      // Recent or default
      return reqAccountGetManyPublicRecent(api, {
        page,
      });
    }
  } else if (type === 'subscribed') {
    if (sort === 'top' && range) {
      return reqAccountGetManySubscribedTop(api, {
        page,
        range,
      });
    } else if (sort === 'a_z') {
      return reqAccountGetManySubscribedAZ(api, {
        page,
      });
    } else {
      // Recent or default
      return reqAccountGetManySubscribedRecent(api, {
        page,
      });
    }
  }

  return Promise.resolve(emptyApiListResponse);
}

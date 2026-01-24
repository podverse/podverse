
import { DTOAccount } from 'src/dtos';
import { ApiRequestService } from '../_request';
import { reqAuthMe } from '../auth/auth';

type ReqLocaleParams = {
  locale: string;
};

type ReqNotificationTypeParams = {
	type: string;
};

export async function reqAccountSettingsLocaleUpdate(
  api: ApiRequestService,
  params: ReqLocaleParams,
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account-settings/locale',
    method: 'PATCH',
    data: {
      locale: params.locale,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountSettingsNotificationTypeCreate(
  api: ApiRequestService,
  params: ReqNotificationTypeParams,
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account-settings/notification-type',
    method: 'POST',
    data: {
      type: params.type,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountSettingsNotificationTypeDelete(
  api: ApiRequestService,
  params: ReqNotificationTypeParams,
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account-settings/notification-type',
    method: 'DELETE',
    data: {
      type: params.type,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

import type { DTOAccount, MediaTypePreference } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import { reqAuthMe } from '../auth/auth.js';

type ReqLocaleParams = {
  locale: string;
};

type ReqNotificationTypeParams = {
  type: string;
};

export async function reqAccountSettingsListenStatsUpdate(
  api: ApiRequestService,
  params: { accepted: boolean }
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account-settings/listen-stats',
    method: 'PATCH',
    data: {
      accepted: params.accepted,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountSettingsPlaybackUpdate(
  api: ApiRequestService,
  params: { preferred_media_type: MediaTypePreference }
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account-settings/playback',
    method: 'PATCH',
    data: {
      preferred_media_type: params.preferred_media_type,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountSettingsLocaleUpdate(
  api: ApiRequestService,
  params: ReqLocaleParams
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

export async function reqAccountSettingsNotificationUpdate(
  api: ApiRequestService,
  params: { auto_enable_on_subscribe: boolean }
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account-settings/notification',
    method: 'PATCH',
    data: {
      auto_enable_on_subscribe: params.auto_enable_on_subscribe,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountSettingsNotificationTypeCreate(
  api: ApiRequestService,
  params: ReqNotificationTypeParams
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
  params: ReqNotificationTypeParams
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

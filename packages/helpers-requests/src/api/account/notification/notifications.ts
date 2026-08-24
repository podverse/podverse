import type { DTOAccountNotification, DTOAccountNotificationPreference } from '@podverse/helpers';
import type { NotificationCategoryValues } from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';

export type ReqNotificationsListResponse = {
  items: DTOAccountNotification[];
  last_seen_at: string | null;
  pagination: {
    page: number;
    total_count: number;
    total_pages: number;
  };
  sections: {
    new_count: number;
  };
};

export type ReqNotificationPreferenceUpdateInput = {
  category: NotificationCategoryValues;
  in_app_enabled: boolean;
  push_enabled: boolean;
};

export const reqNotificationsList = (
  api: ApiRequestService,
  params?: { page?: number; limit?: number }
): Promise<ReqNotificationsListResponse> => {
  const query = new URLSearchParams();
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  const queryString = query.toString();

  return api
    .apiRequest<{ data: ReqNotificationsListResponse }>({
      path: `/account/notifications${queryString === '' ? '' : `?${queryString}`}`,
      method: 'GET',
      config: {
        withCredentials: true,
      },
    })
    .then((response) => response.data);
};

export const reqNotificationsUnseenCount = async (
  api: ApiRequestService
): Promise<{ unseen_count: number }> => {
  const response = await api.apiRequest<{ data: { unseen_count: number } }>({
    path: '/account/notifications/unseen-count',
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
  return response.data;
};

export const reqNotificationsMarkSeen = async (
  api: ApiRequestService
): Promise<{ last_seen_at: string }> => {
  const response = await api.apiRequest<{ data: { last_seen_at: string } }>({
    path: '/account/notifications/mark-seen',
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
  return response.data;
};

export const reqNotificationPreferencesGet = async (
  api: ApiRequestService
): Promise<DTOAccountNotificationPreference[]> => {
  const response = await api.apiRequest<{ data: DTOAccountNotificationPreference[] }>({
    path: '/account/notification-preferences',
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
  return response.data;
};

export const reqNotificationPreferencesUpdate = async (
  api: ApiRequestService,
  params: { preferences: ReqNotificationPreferenceUpdateInput[] }
): Promise<DTOAccountNotificationPreference[]> => {
  const response = await api.apiRequest<{ data: DTOAccountNotificationPreference[] }>({
    path: '/account/notification-preferences',
    method: 'PUT',
    data: params,
    config: {
      withCredentials: true,
    },
  });
  return response.data;
};

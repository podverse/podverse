import type {
  DTOAccountNotification,
  DTOAccountNotificationPreference,
  NotificationCategoryValues,
} from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from './types';

const DEFAULT_NOTIFICATIONS_PAGE_LIMIT = 20;

export type NotificationsPage = {
  items: DTOAccountNotification[];
  newCount: number;
  page: number;
  totalPages: number;
};

export const notificationsRepository = {
  getUnseenCount: async (context: MobileAuthRequestContext): Promise<number> => {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqNotificationsUnseenCount()
    );
    return response.unseen_count;
  },

  list: async (
    context: MobileAuthRequestContext,
    params: { page?: number; limit?: number } = {}
  ): Promise<NotificationsPage> => {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqNotificationsList({
        limit: params.limit ?? DEFAULT_NOTIFICATIONS_PAGE_LIMIT,
        page: params.page ?? 1,
      })
    );
    return {
      items: response.items,
      newCount: response.sections.new_count,
      page: response.pagination.page,
      totalPages: response.pagination.total_pages,
    };
  },

  markSeen: async (context: MobileAuthRequestContext): Promise<void> => {
    await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqNotificationsMarkSeen()
    );
  },

  listPreferences: async (
    context: MobileAuthRequestContext
  ): Promise<DTOAccountNotificationPreference[]> => {
    return requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqNotificationPreferencesGet()
    );
  },

  updatePreferences: async (
    context: MobileAuthRequestContext,
    params: {
      preferences: Array<{
        category: NotificationCategoryValues;
        in_app_enabled: boolean;
        push_enabled: boolean;
      }>;
    }
  ): Promise<DTOAccountNotificationPreference[]> => {
    return requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqNotificationPreferencesUpdate(params)
    );
  },
};

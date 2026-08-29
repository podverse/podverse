import type { NotificationCategoryValues } from '../../lib/notificationCategory.js';

export interface DTOAccountNotificationPreference {
  id: number;
  account_id: number;
  category: NotificationCategoryValues;
  in_app_enabled: boolean;
  push_enabled: boolean;
}

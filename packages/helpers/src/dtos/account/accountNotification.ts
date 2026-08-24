import type { NotificationCategoryValues } from '../../lib/notificationCategory.js';

export interface DTOAccountNotification {
  id: number;
  account_id: number;
  category: NotificationCategoryValues;
  title: string;
  body: string | null;
  link_path: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
}

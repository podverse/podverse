import type { NotificationCategoryValues } from '../../lib/notificationCategory.js';

export interface DTOAccountNotification {
  id: number;
  account_id: number;
  category: NotificationCategoryValues;
  /**
   * True until the account opens its inbox after this row was created.
   *
   * Derived per response from the account's `last_read_at` rather than stored per row, so marking
   * the inbox read is one timestamp write no matter how many notifications it covers.
   */
  is_unread: boolean;
  title: string;
  body: string | null;
  link_path: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
}

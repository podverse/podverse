import type { SyncedNotificationType } from '../../auth';

export type NotificationTypeRow = {
  labelKey: string;
  type: SyncedNotificationType;
};

/**
 * The notification types a user can turn on, in the order they are offered.
 *
 * One list serves the account defaults in Settings and the per-channel switches on a podcast, so the
 * two surfaces cannot drift into offering different types or ordering them differently.
 */
export const NOTIFICATION_TYPE_ROWS: readonly NotificationTypeRow[] = [
  { labelKey: 'settings.notifications.new_item', type: 'new-item' },
  { labelKey: 'settings.notifications.livestream_scheduled', type: 'livestream-scheduled' },
  { labelKey: 'settings.notifications.livestream_started', type: 'livestream-started' },
];

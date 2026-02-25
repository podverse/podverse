import type { DTOAccountNotificationChannelType } from './accountNotificationChannelType.js';

export interface DTOAccountNotificationChannel {
  account_id: number;
  channel_id: number;
  account_notification_channel_types: DTOAccountNotificationChannelType[];
}

import { DTOAccountNotificationChannelType } from './accountNotificationChannelType';

export interface DTOAccountNotificationChannel {
  account_id: number;
  channel_id: number;
  account_notification_channel_types: DTOAccountNotificationChannelType[];
}

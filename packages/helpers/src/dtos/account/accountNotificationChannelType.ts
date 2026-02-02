import type { AccountNotificationTypeEnum } from '../../lib/accountNotificationType.js';

export interface DTOAccountNotificationChannelType {
  id: number;
  type: AccountNotificationTypeEnum;
  account_notification_channel_id: number;
}

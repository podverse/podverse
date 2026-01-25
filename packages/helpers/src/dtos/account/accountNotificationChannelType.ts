import { AccountNotificationTypeEnum } from 'src/lib/accountNotificationType';

export interface DTOAccountNotificationChannelType {
  id: number;
  type: AccountNotificationTypeEnum;
  account_notification_channel_id: number;
}

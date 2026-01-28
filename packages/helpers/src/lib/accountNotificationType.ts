export enum AccountNotificationTypeEnum {
  NewItem = 'new-item',
  LivestreamScheduled = 'livestream-scheduled',
  LivestreamStarting = 'livestream-started',
}

export const ACCOUNT_NOTIFICATION_TYPE_VALUES = Object.values(AccountNotificationTypeEnum);

export type AccountNotificationTypeValues = (typeof ACCOUNT_NOTIFICATION_TYPE_VALUES)[number];

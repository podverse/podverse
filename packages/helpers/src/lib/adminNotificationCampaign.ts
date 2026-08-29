export enum AdminNotificationCampaignStatusEnum {
  Draft = 'draft',
  Scheduled = 'scheduled',
  Sending = 'sending',
  Sent = 'sent',
  Cancelled = 'cancelled',
}

export const ADMIN_NOTIFICATION_CAMPAIGN_STATUS_VALUES = Object.values(
  AdminNotificationCampaignStatusEnum
);

export type AdminNotificationCampaignStatusValues =
  (typeof ADMIN_NOTIFICATION_CAMPAIGN_STATUS_VALUES)[number];

export const ADMIN_NOTIFICATION_AUDIENCE_TYPE_ALL_VALID_MEMBERSHIP = 'all-valid-membership';

export type AdminNotificationAudience = {
  type: typeof ADMIN_NOTIFICATION_AUDIENCE_TYPE_ALL_VALID_MEMBERSHIP;
};

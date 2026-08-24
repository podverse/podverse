export const ADMIN_NOTIFICATION_SEND_JOB_TYPE = 'admin-notification-send';

export type AdminNotificationSendPayload = {
  campaignIdText: string;
};

export const buildAdminNotificationSendDedupeKey = (campaignIdText: string): string =>
  `${ADMIN_NOTIFICATION_SEND_JOB_TYPE}:${campaignIdText}`;

export const parseAdminNotificationSendPayload = (
  payload: Record<string, unknown> | null | undefined
): AdminNotificationSendPayload | null => {
  const campaignIdText = payload?.campaignIdText;
  if (typeof campaignIdText !== 'string' || campaignIdText.trim() === '') {
    return null;
  }

  return {
    campaignIdText,
  };
};

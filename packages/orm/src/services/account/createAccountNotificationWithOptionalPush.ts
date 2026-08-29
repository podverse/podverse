import type { NotificationCategoryValues } from '@podverse/helpers';
import { hasValidMembership } from '@podverse/helpers';

import { AccountService } from './account.js';
import { AccountNotificationService } from './accountNotification.js';
import { AccountNotificationPreferenceService } from './accountNotificationPreference.js';

type NotificationCreateInput = {
  account_id: number;
  category: NotificationCategoryValues;
  title: string;
  body?: string | null;
  link_path?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: Date;
  expires_at?: Date;
};

type PushEvaluation = {
  account_id: number;
  push_enabled: boolean;
  has_valid_membership: boolean;
  has_allow_notifications_entitlement: boolean;
};

export type CreateAccountNotificationWithOptionalPushResult = {
  notifications_created: number;
  push_evaluation: PushEvaluation[];
};

export const createAccountNotificationWithOptionalPush = async (
  notifications: NotificationCreateInput[]
): Promise<CreateAccountNotificationWithOptionalPushResult> => {
  const accountNotificationService = new AccountNotificationService();
  const accountPreferenceService = new AccountNotificationPreferenceService();
  const accountService = new AccountService();

  const createdRows = await accountNotificationService.createMany(notifications);
  const uniqueAccountIds = Array.from(
    new Set(notifications.map((notification) => notification.account_id))
  );

  const pushEvaluation: PushEvaluation[] = [];
  for (const accountId of uniqueAccountIds) {
    const account = await accountService.get(accountId, {
      relations: {
        account_membership_status: {
          account_membership: true,
        },
      },
    });
    const membershipStatus = account?.account_membership_status;
    const hasValidMembershipStatus =
      membershipStatus !== null &&
      membershipStatus !== undefined &&
      hasValidMembership(membershipStatus);
    const allowNotifications = membershipStatus?.allow_notifications;
    const hasAllowNotificationsEntitlement =
      allowNotifications === null || allowNotifications === undefined ? true : allowNotifications;

    const preferences = await accountPreferenceService.getForAccount(accountId);
    const pushEnabled = preferences.some((preference) => preference.push_enabled === true);

    pushEvaluation.push({
      account_id: accountId,
      push_enabled: pushEnabled,
      has_valid_membership: hasValidMembershipStatus,
      has_allow_notifications_entitlement: hasAllowNotificationsEntitlement,
    });
  }

  return {
    notifications_created: createdRows.length,
    push_evaluation: pushEvaluation,
  };
};

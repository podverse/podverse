import { AccountService } from '@orm/services/account/account.js';

import {
  ADMIN_NOTIFICATION_AUDIENCE_TYPE_ALL_VALID_MEMBERSHIP,
  hasValidMembership,
} from '@podverse/helpers';

import type { AdminNotificationCampaign } from '../../entities/account/adminNotificationCampaign.js';
import { createAccountNotificationWithOptionalPush } from './createAccountNotificationWithOptionalPush.js';

export const resolveAdminNotificationAudienceAccountIds = async (
  audience: AdminNotificationCampaign['audience']
): Promise<number[]> => {
  if (audience.type !== ADMIN_NOTIFICATION_AUDIENCE_TYPE_ALL_VALID_MEMBERSHIP) {
    return [];
  }

  const accountService = new AccountService();
  const accounts = await accountService.getMany({
    relations: {
      account_membership_status: {
        account_membership: true,
      },
    },
  });

  return accounts
    .filter((account) => {
      const membershipStatus = account.account_membership_status;
      return (
        membershipStatus !== null &&
        membershipStatus !== undefined &&
        hasValidMembership(membershipStatus)
      );
    })
    .map((account) => account.id);
};

export const dispatchAdminNotificationCampaign = async (campaign: AdminNotificationCampaign) => {
  const accountIds = await resolveAdminNotificationAudienceAccountIds(campaign.audience);
  if (accountIds.length === 0) {
    return { notifications_created: 0, push_evaluation: [] };
  }

  return createAccountNotificationWithOptionalPush(
    accountIds.map((accountId) => ({
      account_id: accountId,
      body: campaign.body ?? null,
      category: campaign.category,
      link_path: campaign.link_path ?? null,
      payload: {
        campaign_id_text: campaign.id_text,
      },
      title: campaign.title,
    }))
  );
};

import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import { getAccountEntitlements } from '@api/lib/accountEntitlements.js';

import {
  AccountMembershipEnum,
  hasValidMembership,
  membershipStoresListens,
} from '@podverse/helpers';
import {
  AccountService,
  BillingPriceCatalogService,
  ChannelService,
  TasteProfileAccountService,
} from '@podverse/orm';

/**
 * Whether this authenticated request can store Taste Profile rows. Requires membership gates
 * to have run so `account_membership_id` and `entitlements` are set.
 */
export function storesListensFromAuthenticatedUser(user: Express.User): boolean {
  const membershipId = user.account_membership_id;
  if (membershipId === undefined) {
    return false;
  }
  return membershipStoresListens(membershipId, user.entitlements?.trackStats === true);
}

/**
 * Resolves whether an account stores Taste Profile listens when the request skipped membership
 * gates (for example Taste Profile Yes, or reading recommendations).
 */
export async function resolveAccountStoresListens(accountId: number): Promise<boolean> {
  const account = await new AccountService().get(accountId, {
    relations: { account_membership_status: { account_membership: true } },
  });
  const status = account?.account_membership_status;
  if (status === undefined || status === null || !hasValidMembership(status)) {
    return false;
  }

  const membershipRawId = status.account_membership?.id;
  const membershipId =
    membershipRawId === AccountMembershipEnum.Premium
      ? AccountMembershipEnum.Premium
      : membershipRawId === AccountMembershipEnum.Trial
        ? AccountMembershipEnum.Trial
        : undefined;
  if (membershipId === undefined) {
    return false;
  }

  const capDefaults = await new BillingPriceCatalogService().resolveProductMembershipCapDefaults();
  const entitlements = getAccountEntitlements(status, capDefaults);
  return membershipStoresListens(membershipId, entitlements.trackStats);
}

/**
 * Seeds subscribe taste rows after a follow or Taste Profile Yes. Failures are logged and
 * swallowed: the follow or consent write already succeeded, and recommendations list seeding
 * catches up later.
 */
export async function seedTasteFromSubscriptions(
  accountId: number,
  storesListens: boolean,
  channelIds?: readonly number[]
): Promise<void> {
  try {
    await new TasteProfileAccountService().seedSubscribedShows(
      accountId,
      config.tasteProfileAgreement.version,
      storesListens,
      channelIds
    );
  } catch (error) {
    loggerService.error('Could not seed Taste Profile rows from subscriptions', {
      account_id: accountId,
      error,
    });
  }
}

/**
 * Drops unused subscribe seeds after an unfollow. Failures are logged and swallowed: the unfollow
 * already succeeded.
 */
export async function dropUnusedSubscribeSeedsForChannels(
  accountId: number,
  channelIdTexts: readonly string[]
): Promise<void> {
  if (channelIdTexts.length === 0) {
    return;
  }
  try {
    const channels = await new ChannelService().getManyByIdTexts([...channelIdTexts]);
    if (channels.length === 0) {
      return;
    }
    await new TasteProfileAccountService().dropUnusedSubscribeSeeds(
      accountId,
      channels.map((channel) => channel.id)
    );
  } catch (error) {
    loggerService.error('Could not drop unused subscribe Taste Profile seeds', {
      account_id: accountId,
      error,
    });
  }
}

export async function resolveChannelIdsFromIdTexts(
  channelIdTexts: readonly string[]
): Promise<number[]> {
  if (channelIdTexts.length === 0) {
    return [];
  }
  const channels = await new ChannelService().getManyByIdTexts([...channelIdTexts]);
  return channels.map((channel) => channel.id);
}

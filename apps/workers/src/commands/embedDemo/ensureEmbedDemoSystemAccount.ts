import { randomBytes } from 'node:crypto';

import {
  AccountMembershipEnum,
  EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
  EMBED_DEMO_SYSTEM_MEMBERSHIP_YEARS,
} from '@podverse/helpers';
import type { AccountService } from '@podverse/orm';
import { AccountMembershipStatusService } from '@podverse/orm';

type EmbedDemoAccountService = Pick<AccountService, 'getByUsername' | 'create'>;

const embedDemoAccountRelations = {
  relations: {
    account_membership_status: {
      account_membership: true,
    },
  },
} as const;

export function generateEmbedDemoSystemPassword(): string {
  return `${randomBytes(24).toString('base64url')}A1`;
}

function addYears(from: Date, years: number): Date {
  const result = new Date(from);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

/**
 * Ensures the backend-owned embed demo account exists with premium membership
 * through {@link EMBED_DEMO_SYSTEM_MEMBERSHIP_YEARS}. Password is random on create
 * only; never logged.
 */
export async function ensureEmbedDemoSystemAccount(
  accountService: EmbedDemoAccountService
): Promise<number> {
  let account = await accountService.getByUsername(
    EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
    embedDemoAccountRelations
  );

  if (account === null) {
    await accountService.create(
      {
        username: EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
        password: generateEmbedDemoSystemPassword(),
        locale: 'en-US',
      },
      true
    );

    account = await accountService.getByUsername(
      EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
      embedDemoAccountRelations
    );

    if (account === null) {
      throw new Error(
        '[seedEmbedDemoShowcaseFeeds] Failed to create embed demo system account after insert.'
      );
    }
  }

  const accountMembershipStatusService = new AccountMembershipStatusService();
  await accountMembershipStatusService.update(account, {
    account_membership_id: AccountMembershipEnum.Premium,
    membership_expires_at: addYears(new Date(), EMBED_DEMO_SYSTEM_MEMBERSHIP_YEARS),
  });

  return account.id;
}

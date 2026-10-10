import type { DTOBillingStatus } from '@podverse/helpers';
import { AccountService } from '@podverse/orm';

const toIsoOrNull = (value: Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toISOString();

/** Null when the account does not exist. */
export async function getBillingStatus(
  accountId: number,
  now: Date = new Date()
): Promise<DTOBillingStatus | null> {
  const account = await new AccountService().getWithMembershipStatusFromPrimary(accountId);
  if (account === null) {
    return null;
  }
  const membershipStatus = account.account_membership_status;
  const expiresAt = membershipStatus?.membership_expires_at ?? null;

  return {
    tier: membershipStatus?.account_membership?.tier ?? null,
    is_entitled: expiresAt !== null && expiresAt.getTime() > now.getTime(),
    membership_expires_at: toIsoOrNull(expiresAt),
    in_grace_period: false,
    billing_cadence: membershipStatus?.billing_cadence ?? null,
    billing_customer_ref: account.billing_customer_ref,
  };
}

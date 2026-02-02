import type { AccountMembershipEnum } from '../lib/accountMembership.js';

export interface DTOMembershipClaimToken {
  id: string;
  claimed: boolean;
  months_to_add: number;
  account_membership_id: number;
  account_membership: AccountMembershipEnum;
}

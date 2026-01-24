export interface DTOAccountMembershipStatus {
  id: number;
  account_id: number;
  account_membership_id: number;
  membership_expires_at: string | null;
  auto_renew: boolean;
}

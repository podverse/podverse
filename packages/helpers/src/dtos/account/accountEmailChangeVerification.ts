export interface DTOAccountEmailChangeVerification {
  id: number;
  account_id: number;
  verification_token: string;
  verification_token_expires_at: string;
  pending_email_address: string;
}

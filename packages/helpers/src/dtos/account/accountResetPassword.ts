export interface DTOAccountResetPassword {
  id: number;
  account_id: number;
  reset_token: string;
  reset_token_expires_at: string;
}

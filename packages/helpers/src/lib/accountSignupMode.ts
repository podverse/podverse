export const ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_USERNAME = 'admin_only_username';
export const ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_EMAIL = 'admin_only_email';
export const ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL = 'user_signup_email';

export const ACCOUNT_SIGNUP_MODE_VALUES = [
  ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_USERNAME,
  ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_EMAIL,
  ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL,
] as const;

export type AccountSignupMode = (typeof ACCOUNT_SIGNUP_MODE_VALUES)[number];

export type AccountSignupModeCapabilities = {
  canPublicSignup: boolean;
  canUseEmailVerificationFlows: boolean;
  canIssueAdminInviteLink: boolean;
  requiresEmailAtInviteCompletion: boolean;
};

export function getAccountSignupModeCapabilities(
  mode: AccountSignupMode
): AccountSignupModeCapabilities {
  if (mode === ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_USERNAME) {
    return {
      canPublicSignup: false,
      canUseEmailVerificationFlows: false,
      canIssueAdminInviteLink: true,
      requiresEmailAtInviteCompletion: false,
    };
  }
  if (mode === ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_EMAIL) {
    return {
      canPublicSignup: false,
      canUseEmailVerificationFlows: true,
      canIssueAdminInviteLink: true,
      requiresEmailAtInviteCompletion: true,
    };
  }
  return {
    canPublicSignup: true,
    canUseEmailVerificationFlows: true,
    canIssueAdminInviteLink: false,
    requiresEmailAtInviteCompletion: false,
  };
}

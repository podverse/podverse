import type { AccountSignupMode } from '@podverse/helpers';
import { ACCOUNT_SIGNUP_MODE_VALUES } from '@podverse/helpers';

export type { AccountSignupMode };

/**
 * Signup mode for email-flow controls. An unset or unknown value is `user_signup_email`,
 * which includes those flows. Literal `EXPO_PUBLIC_*` reads also live in `env.ts`,
 * `billingEnv.ts`, `e2eEnv.ts`, and `perfEnv.ts`.
 */
const ACCOUNT_SIGNUP_MODE_FALLBACK: AccountSignupMode = 'user_signup_email';

export function isAccountSignupMode(value: string): value is AccountSignupMode {
  for (const mode of ACCOUNT_SIGNUP_MODE_VALUES) {
    if (mode === value) {
      return true;
    }
  }
  return false;
}

export function getMobileAccountSignupModeFromEnv(): AccountSignupMode {
  const raw = process.env.EXPO_PUBLIC_ACCOUNT_SIGNUP_MODE?.trim();
  if (raw !== undefined && isAccountSignupMode(raw)) {
    return raw;
  }
  return ACCOUNT_SIGNUP_MODE_FALLBACK;
}

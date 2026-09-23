import type { DTOAccount } from '@podverse/helpers/dto';
import { getErrorResponseStatus } from '@podverse/helpers/error';

import { accountRepository } from '../data/repositories/accountRepository';
import { runSignupSubscriptionMerge } from '../data/repositories/subscriptionsSignupMerge';
import type { SessionEndReason } from './forcedLogoutNotice';
import { loginWithMobileToken } from './loginWithMobileToken';
import { reconcileAccountPrefsFromAccount } from './syncAccountPrefs';

type SetTokens = (params: { accessToken: string; refreshToken: string }) => Promise<void>;

export type CompleteMobilePasswordLoginError =
  | 'account_load_failed'
  | 'could_not_sign_in'
  | 'invalid_credentials'
  | 'mobile_api_not_configured'
  | 'session_expired';

export type CompleteMobilePasswordLoginResult =
  { ok: true } | { error: CompleteMobilePasswordLoginError; ok: false };

export type CompleteMobilePasswordLoginParams = {
  clearSession: (reason: SessionEndReason) => Promise<void>;
  email: string;
  password: string;
  setAccount: (account: DTOAccount | null) => void;
  setAuthError: (value: string | null) => void;
  setTokens: SetTokens;
};

/**
 * Password login plus the account hydrate the sign-in spinner waits on.
 *
 * Callers map `error` to catalog copy. A thrown network error becomes `could_not_sign_in`
 * so the screen never stays put with no message.
 */
export const completeMobilePasswordLogin = async ({
  clearSession,
  email,
  password,
  setAccount,
  setAuthError,
  setTokens,
}: CompleteMobilePasswordLoginParams): Promise<CompleteMobilePasswordLoginResult> => {
  try {
    const result = await loginWithMobileToken({ email, password, setTokens });
    if (!result.ok) {
      return { error: result.error, ok: false };
    }

    const authContext = {
      accessToken: result.accessToken,
      clearSession,
      refreshToken: result.refreshToken,
      setTokens,
    };

    // Before the refresh below, which makes the account authoritative over local subscriptions.
    // Only does anything when this device just created this account; never throws.
    await runSignupSubscriptionMerge(email, authContext);

    try {
      // The caller is waiting on this sign-in, so the account itself is fetched inline. What it
      // implies — the directory walk, playlists, the car index, device registration — is queued
      // by the sign-in trigger, because none of it is worth holding the caller for.
      const account = await accountRepository.refreshSnapshot(authContext);
      setAccount(account);
      try {
        await reconcileAccountPrefsFromAccount(account);
      } catch (error) {
        console.warn('Failed to reconcile account prefs after login hydrate', error);
      }
      setAuthError(null);
      return { ok: true };
    } catch (error) {
      if (getErrorResponseStatus(error) === 401) {
        return { error: 'session_expired', ok: false };
      }

      setAuthError('auth_bootstrap_failed');
      return { error: 'account_load_failed', ok: false };
    }
  } catch {
    return { error: 'could_not_sign_in', ok: false };
  }
};

export const completeMobilePasswordLoginMessageKey = (
  error: CompleteMobilePasswordLoginError
):
  | 'authentication.could_not_sign_in'
  | 'authentication.invalid_email_or_password'
  | 'authentication.mobile_api_not_configured'
  | 'authentication.session_expired'
  | 'authentication.signed_in_account_load_failed' => {
  switch (error) {
    case 'account_load_failed':
      return 'authentication.signed_in_account_load_failed';
    case 'could_not_sign_in':
      return 'authentication.could_not_sign_in';
    case 'invalid_credentials':
      return 'authentication.invalid_email_or_password';
    case 'mobile_api_not_configured':
      return 'authentication.mobile_api_not_configured';
    case 'session_expired':
      return 'authentication.session_expired';
  }
};

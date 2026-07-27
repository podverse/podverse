/**
 * Local-dev login field defaults (not E2E, not production).
 *
 * Matches `infra/development/seeds/local-dev-accounts.sql` (premium account).
 * Prefill only when Metro `__DEV__` is on and `EXPO_PUBLIC_MOBILE_E2E` is off so Maestro
 * still types into empty fields and release builds never get these values at runtime.
 */

export const LOCAL_DEV_LOGIN_EMAIL = 'local-premium@example.com';
export const LOCAL_DEV_LOGIN_PASSWORD = 'Test!1Aa';

export type LocalDevLoginPrefill = {
  email: string;
  password: string;
};

/** Pure gate used by LoginScreen and unit tests. */
export const resolveLocalDevLoginPrefill = (params: {
  isDev: boolean;
  isE2e: boolean;
}): LocalDevLoginPrefill | null => {
  if (!params.isDev || params.isE2e) {
    return null;
  }
  return {
    email: LOCAL_DEV_LOGIN_EMAIL,
    password: LOCAL_DEV_LOGIN_PASSWORD,
  };
};

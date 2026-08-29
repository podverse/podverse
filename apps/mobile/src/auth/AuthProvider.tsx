import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { DTOAccount } from '@podverse/helpers/dto';

import { getMobileConfig } from '../config';
// Import the repository from its module (not the data barrel) to avoid an import cycle through
// the auth barrel.
import { accountRepository } from '../data/repositories/accountRepository';
import { resolveSupportedLocale } from '../i18n/locale';
import { startFcmTokenRefreshSync, stopFcmTokenRefreshSync } from '../push/fcmDeviceSync';
import { refreshAccessTokenSingleFlight } from './authRequestWithRefresh';
import type { SessionEndReason } from './forcedLogoutNotice';
import {
  clearForcedLogoutNotice,
  markForcedLogout,
  shouldNotifyForcedLogout,
} from './forcedLogoutNotice';
import { logoutWithMobileRevoke } from './logoutWithMobileRevoke';
import { clearAllSecureTokens, readSecureToken, writeSecureToken } from './secureTokenStorage';
import { reconcileAccountPrefsFromAccount } from './syncAccountPrefs';

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

// E2E flows must always start from a clean anonymous session. Maestro
// `launchApp: clearState` does not clear expo-secure-store (iOS Keychain /
// Android keystore-backed prefs), so a prior flow's login would otherwise persist
// and boot straight into the authenticated shell (or block hydrate). The `__DEV__`
// guard guarantees this reset can never run in a release build even if the E2E
// flag is somehow set.
const shouldResetSessionForE2e = (): boolean => {
  return __DEV__ && getMobileConfig().isE2e;
};

type SetTokensInput = {
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  account: DTOAccount | null;
  accessToken: string | null;
  clearSession: (reason: SessionEndReason) => Promise<void>;
  error: string | null;
  hydrateFromSecureStorage: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: string | null;
  refreshWithStoredToken: () => Promise<string | null>;
  setAccount: (account: DTOAccount | null) => void;
  setError: (value: string | null) => void;
  setTokens: (tokens: SetTokensInput) => Promise<void>;
  status: AuthStatus;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [account, setAccount] = useState<DTOAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('unknown');

  const setTokens = useCallback(async ({ accessToken, refreshToken }: SetTokensInput) => {
    await Promise.all([
      writeSecureToken('accessToken', accessToken),
      writeSecureToken('refreshToken', refreshToken),
      // Holding valid credentials again settles the question, whether the user acted on the notice
      // or logged in without ever seeing it.
      clearForcedLogoutNotice(),
    ]);

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setStatus('authenticated');
    setError(null);
  }, []);

  const clearSession = useCallback(async (reason: SessionEndReason) => {
    await clearAllSecureTokens();

    if (shouldNotifyForcedLogout(reason)) {
      try {
        await markForcedLogout();
      } catch (markError) {
        console.warn('Failed to record the forced-logout notice', markError);
      }
    }

    try {
      // Only the account snapshot goes. Subscriptions and add-by-RSS feeds are retained —
      // they are the device's data, and a signed-out user keeps browsing and playing them.
      await accountRepository.clearSnapshot();
    } catch (snapshotError) {
      console.warn('Failed to clear cached account data during session reset', snapshotError);
    }

    setAccessToken(null);
    setRefreshToken(null);
    setAccount(null);
    setError(null);
    setStatus('anonymous');
  }, []);

  const hydrateFromSecureStorage = useCallback(async () => {
    if (shouldResetSessionForE2e()) {
      await clearSession('reset');
      return;
    }

    const [storedAccessToken, storedRefreshToken] = await Promise.all([
      readSecureToken('accessToken'),
      readSecureToken('refreshToken'),
    ]);

    setAccessToken(storedAccessToken);
    setRefreshToken(storedRefreshToken);
    if (storedAccessToken === null) {
      setStatus('anonymous');
      return;
    }

    // Both sources here are local — SecureStore for the tokens, SQLite for the account — so the
    // shell renders at the correct signed-in state without a single request. `SyncProvider` sees
    // the resolved status and queues the refresh behind the app being usable.
    try {
      const cachedAccount = await accountRepository.getSnapshot();
      if (cachedAccount !== null) {
        setAccount(cachedAccount);
        await reconcileAccountPrefsFromAccount(cachedAccount);
      }
    } catch (snapshotError) {
      console.warn('Failed to read cached account snapshot during auth bootstrap', snapshotError);
    }

    // Holding tokens is what makes a session, not having fetched the account. A first launch after
    // login has no snapshot yet and still belongs in the authenticated shell; the account details
    // arrive behind the sync indicator.
    setStatus('authenticated');
    setError(null);
  }, [clearSession]);

  const refreshWithStoredToken = useCallback(async () => {
    return refreshAccessTokenSingleFlight({
      clearSession,
      refreshToken,
      setTokens,
    });
  }, [clearSession, refreshToken, setTokens]);

  const logout = useCallback(async () => {
    await logoutWithMobileRevoke({
      accessToken,
      clearSession,
      refreshToken,
    });
  }, [accessToken, clearSession, refreshToken]);

  useEffect(() => {
    void hydrateFromSecureStorage();
  }, [hydrateFromSecureStorage]);

  useEffect(() => {
    if (status !== 'authenticated') {
      stopFcmTokenRefreshSync();
      return;
    }

    if (getMobileConfig().pushProvider !== 'fcm') {
      stopFcmTokenRefreshSync();
      return;
    }

    const locale = resolveSupportedLocale(
      account?.account_settings?.account_settings_locale?.locale
    );
    startFcmTokenRefreshSync({ accessToken, locale });

    return () => {
      stopFcmTokenRefreshSync();
    };
  }, [accessToken, account, status]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      account,
      accessToken,
      clearSession,
      error,
      hydrateFromSecureStorage,
      logout,
      refreshToken,
      refreshWithStoredToken,
      setAccount,
      setError,
      setTokens,
      status,
    };
  }, [
    account,
    accessToken,
    clearSession,
    error,
    hydrateFromSecureStorage,
    logout,
    refreshToken,
    refreshWithStoredToken,
    setTokens,
    status,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { DTOAccount } from '@podverse/helpers/dto';

import { getMobileConfig } from '../config';
import { applyAccountLocaleOverride } from '../i18n';
import { getErrorStatusCode } from '../lib/httpError';
import {
  refreshAccessTokenSingleFlight,
  requestWithMobileAuthRefresh,
} from './authRequestWithRefresh';
import { logoutWithMobileRevoke } from './logoutWithMobileRevoke';
import { clearAllSecureTokens, readSecureToken, writeSecureToken } from './secureTokenStorage';

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

// Bootstrap `/auth/me` must never leave the app stuck on the `status === 'unknown'`
// blank render when the network is slow/unreachable; the request layer aborts the
// in-flight call after this budget so hydrate always resolves to a real status.
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

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
  clearSession: () => Promise<void>;
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
    ]);

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setStatus('authenticated');
    setError(null);
  }, []);

  const clearSession = useCallback(async () => {
    await clearAllSecureTokens();

    setAccessToken(null);
    setRefreshToken(null);
    setAccount(null);
    setError(null);
    setStatus('anonymous');
  }, []);

  const hydrateFromSecureStorage = useCallback(async () => {
    if (shouldResetSessionForE2e()) {
      await clearSession();
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

    try {
      const account = await requestWithMobileAuthRefresh(
        {
          accessToken: storedAccessToken,
          clearSession,
          refreshToken: storedRefreshToken,
          setTokens,
        },
        async (apiRequestService) => {
          return apiRequestService.apiRequest<DTOAccount>({
            path: '/auth/me',
            method: 'GET',
            // Cancel the in-flight request (and its refresh retry) once the budget
            // elapses so hydrate never hangs on `status === 'unknown'`.
            abort: {
              controller: new AbortController(),
              timeoutMs: AUTH_BOOTSTRAP_TIMEOUT_MS,
            },
          });
        }
      );
      setAccount(account);
      try {
        await applyAccountLocaleOverride(account.account_settings?.account_settings_locale?.locale);
      } catch (error) {
        console.warn('Failed to apply account locale during auth bootstrap', error);
      }
      setStatus('authenticated');
      setError(null);
    } catch (error) {
      if (getErrorStatusCode(error) === 401) {
        await clearSession();
        return;
      }

      // Keep the persisted session and show authenticated shell with an error state.
      // Falling back to anonymous here leaves a split-brain state (tokens exist, UI says anonymous).
      setAccount(null);
      setStatus('authenticated');
      setError('auth_bootstrap_failed');
    }
  }, [clearSession, setTokens]);

  const refreshWithStoredToken = useCallback(async () => {
    return refreshAccessTokenSingleFlight({
      clearSession,
      refreshToken,
      setTokens,
    });
  }, [clearSession, refreshToken, setTokens]);

  const logout = useCallback(async () => {
    await logoutWithMobileRevoke({
      clearSession,
      refreshToken,
    });
  }, [clearSession, refreshToken]);

  useEffect(() => {
    void hydrateFromSecureStorage();
  }, [hydrateFromSecureStorage]);

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

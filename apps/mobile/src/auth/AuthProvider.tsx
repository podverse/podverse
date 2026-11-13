import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { DTOAccount } from '@podverse/helpers/dto';

import { getMobileConfig } from '../config';
// Import the repository from its module (not the data barrel) to avoid an import cycle through
// the auth barrel.
import { accountRepository } from '../data/repositories/accountRepository';
import { addByRssCredentialStore } from '../data/repositories/addByRssCredentialStore';
import { homeClipsCacheRepository } from '../data/repositories/homeClipsCacheRepository';
import { homeLivestreamsCacheRepository } from '../data/repositories/homeLivestreamsCacheRepository';
import { playlistRepository } from '../data/repositories/playlistRepository';
import { queueRepository } from '../data/repositories/queueRepository';
import { resolveSupportedLocale } from '../i18n/locale';
import { startFcmTokenRefreshSync, stopFcmTokenRefreshSync } from '../push/fcmDeviceSync';
import {
  adoptStoredCredentials,
  advanceAuthSessionGeneration,
  getAuthSessionGeneration,
  primeAccessTokenRefresh,
  refreshAccessTokenSingleFlight,
  rememberAccessToken,
  rememberSavedCredentials,
} from './authRequestWithRefresh';
import { shouldResetLeakedE2eSession } from './e2eSessionReset';
import type { ClearSession } from './forcedLogoutNotice';
import {
  clearForcedLogoutNotice,
  markForcedLogout,
  shouldNotifyForcedLogout,
} from './forcedLogoutNotice';
import { logoutWithMobileRevoke } from './logoutWithMobileRevoke';
import {
  clearAllSecureTokens,
  readSecureTokenResult,
  writeSecureToken,
} from './secureTokenStorage';
import { reconcileAccountPrefsFromAccount } from './syncAccountPrefs';

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

type SetTokensInput = {
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  account: DTOAccount | null;
  accessToken: string | null;
  clearSession: ClearSession;
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
  // Concurrent 401s all race into clearSession; they share one wipe rather than each re-clearing
  // storage, re-marking the notice, and re-running repository clears. The first call's notice is
  // the one recorded. Every 401 for one ended session carries the same notice.
  const clearSessionInFlightRef = useRef<Promise<void> | null>(null);
  const hydrateFromSecureStorageRef = useRef<() => Promise<void>>(async () => undefined);

  const setTokens = useCallback(async ({ accessToken, refreshToken }: SetTokensInput) => {
    const generationAtStart = getAuthSessionGeneration();
    // Publish before the keychain write so a request already in flight sees this access token.
    rememberAccessToken(accessToken);
    await Promise.all([
      writeSecureToken('accessToken', accessToken),
      // The refresh token becomes sendable only once the keychain holds it, and only for the
      // session the write started in.
      writeSecureToken('refreshToken', refreshToken).then(() => {
        if (generationAtStart === getAuthSessionGeneration()) {
          rememberSavedCredentials(accessToken, refreshToken);
        }
      }),
      // Holding valid credentials again settles the question, whether the user acted on the notice
      // or logged in without ever seeing it.
      clearForcedLogoutNotice(),
    ]);

    // Sign-out during the keychain write already cleared the published tokens.
    if (generationAtStart !== getAuthSessionGeneration()) {
      return;
    }

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setStatus('authenticated');
    setError(null);
  }, []);

  const clearSession = useCallback<ClearSession>(async (reason, notice = null) => {
    if (clearSessionInFlightRef.current !== null) {
      return clearSessionInFlightRef.current;
    }

    const clearPromise = (async () => {
      // Bump before any await so an in-flight refresh cannot write tokens after this clear starts.
      advanceAuthSessionGeneration();

      await clearAllSecureTokens();

      // Add-by-RSS feed credentials an account saved end with its session. The feeds stay, and
      // so do the credentials saved while signed out, which belong to whoever uses this phone
      // signed out.
      try {
        await addByRssCredentialStore.clearAccountCredentials();
      } catch (credentialError) {
        console.warn(
          'Failed to clear add-by-RSS credentials during session reset',
          credentialError
        );
      }

      if (shouldNotifyForcedLogout(reason)) {
        try {
          await markForcedLogout({ notice });
        } catch (markError) {
          console.warn('Failed to record the forced-logout notice', markError);
        }
      }

      try {
        // Account data goes with the session: the account snapshot, queue data, playlists, the
        // subscribed livestreams page Home paints from, and the subscribed clips snapshot.
        // Subscriptions and add-by-RSS feeds are the device's data; a signed-out user keeps
        // browsing and playing them.
        await accountRepository.clearSnapshot();
        await queueRepository.clearAll();
        await playlistRepository.clearAll();
        await homeLivestreamsCacheRepository.clear();
        await homeClipsCacheRepository.clear();
      } catch (snapshotError) {
        console.warn('Failed to clear cached account data during session reset', snapshotError);
      }

      setAccessToken(null);
      setRefreshToken(null);
      setAccount(null);
      setError(null);
      setStatus('anonymous');
    })();

    clearSessionInFlightRef.current = clearPromise;
    try {
      await clearPromise;
    } finally {
      clearSessionInFlightRef.current = null;
    }
  }, []);

  const hydrateFromSecureStorage = useCallback(async () => {
    if (await shouldResetLeakedE2eSession()) {
      await clearSession('reset');
      return;
    }

    const [accessResult, refreshResult] = await Promise.all([
      readSecureTokenResult('accessToken'),
      readSecureTokenResult('refreshToken'),
    ]);

    // Store unreadable (e.g. before first unlock) is not signed-out — leave status unknown and
    // retry; never clearSession from a failed read.
    if (accessResult.status === 'unavailable' || refreshResult.status === 'unavailable') {
      console.warn('SecureStore unavailable during auth bootstrap; will retry');
      setTimeout(() => {
        void hydrateFromSecureStorageRef.current();
      }, 1000);
      return;
    }

    const storedAccessToken = accessResult.value;
    const storedRefreshToken = refreshResult.value;

    setAccessToken(storedAccessToken);
    setRefreshToken(storedRefreshToken);
    if (storedAccessToken === null) {
      setStatus('anonymous');
      return;
    }

    // Rewriting with AFTER_FIRST_UNLOCK keeps a token stored under a stricter keychain class
    // readable by background work while the phone is locked.
    try {
      await writeSecureToken('accessToken', storedAccessToken);
      if (storedRefreshToken !== null && storedRefreshToken !== '') {
        await writeSecureToken('refreshToken', storedRefreshToken);
      }
    } catch (rewriteError) {
      console.warn(
        'Failed to rewrite auth tokens with updated keychain accessibility',
        rewriteError
      );
    }

    if (storedRefreshToken !== null) {
      adoptStoredCredentials(storedAccessToken, storedRefreshToken);
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

    if (storedRefreshToken !== null) {
      primeAccessTokenRefresh({
        accessToken: storedAccessToken,
        clearSession,
        refreshToken: storedRefreshToken,
        setTokens,
      });
    }
  }, [clearSession, setTokens]);
  hydrateFromSecureStorageRef.current = hydrateFromSecureStorage;

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
    startFcmTokenRefreshSync({
      auth: { accessToken, clearSession, refreshToken, setTokens },
      locale,
    });

    return () => {
      stopFcmTokenRefreshSync();
    };
  }, [accessToken, account, clearSession, refreshToken, setTokens, status]);

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

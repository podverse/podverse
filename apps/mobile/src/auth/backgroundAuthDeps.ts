import {
  advanceAuthSessionGeneration,
  rememberAuthCredentials,
  type AuthRequestDeps,
} from './authRequestWithRefresh';
import {
  clearAllSecureTokens,
  readSecureToken,
  writeSecureToken,
} from './secureTokenStorage';

/**
 * Auth deps for headless / background work: tokens from SecureStore, writes stay in SecureStore.
 * React state is not updated (there may be no AuthProvider); the next foreground hydrate picks up.
 */
export const createBackgroundAuthDeps = async (): Promise<AuthRequestDeps | null> => {
  const [accessToken, refreshToken] = await Promise.all([
    readSecureToken('accessToken'),
    readSecureToken('refreshToken'),
  ]);

  if (accessToken === null || accessToken === '' || refreshToken === null || refreshToken === '') {
    return null;
  }

  rememberAuthCredentials(accessToken, refreshToken);

  return {
    accessToken,
    refreshToken,
    setTokens: async ({ accessToken: nextAccess, refreshToken: nextRefresh }) => {
      rememberAuthCredentials(nextAccess, nextRefresh);
      await Promise.all([
        writeSecureToken('accessToken', nextAccess),
        writeSecureToken('refreshToken', nextRefresh),
      ]);
    },
    clearSession: async () => {
      advanceAuthSessionGeneration();
      await clearAllSecureTokens();
    },
  };
};

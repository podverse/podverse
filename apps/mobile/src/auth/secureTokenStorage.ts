import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

type AuthTokenKey = 'accessToken' | 'refreshToken';

const resolveStorageKey = (key: AuthTokenKey): string => {
  if (key === 'accessToken') {
    return ACCESS_TOKEN_KEY;
  }

  return REFRESH_TOKEN_KEY;
};

export const readSecureToken = async (key: AuthTokenKey): Promise<string | null> => {
  return SecureStore.getItemAsync(resolveStorageKey(key));
};

export const writeSecureToken = async (key: AuthTokenKey, value: string): Promise<void> => {
  await SecureStore.setItemAsync(resolveStorageKey(key), value);
};

export const deleteSecureToken = async (key: AuthTokenKey): Promise<void> => {
  await SecureStore.deleteItemAsync(resolveStorageKey(key));
};

export const clearAllSecureTokens = async (): Promise<void> => {
  await Promise.all([deleteSecureToken('accessToken'), deleteSecureToken('refreshToken')]);
};

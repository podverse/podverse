/**
 * Alby wallet for the app. Other areas import this file and no other file under `alby/`.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { getMobileConfig } from '../../config';
import type { AlbyHttp } from './albyHttp';
import { createAlbyHttp, createDefaultAlbyTransport } from './albyHttp';
import type { AlbyAccountSnapshot, AlbyConnectResult } from './albySession';
import { AlbyProviderError, createAlbySession } from './albySession';

export const ALBY_PROVIDER_KEY = 'alby' as const;

export type { AlbyAccountSnapshot, AlbyConnectResult };
export { AlbyProviderError };
export type {
  AlbyInvoicePaymentResult,
  AlbyKeysendPayment,
  AlbyKeysendPaymentResult,
} from './albyProtocol';

/**
 * Readable while the phone is unlocked. Every read, write, and delete passes the same options
 * so a later read finds the value that was stored.
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

const store = {
  get: (key: string) => SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS),
  delete: (key: string) => SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
};

const browser = {
  maybeCompleteAuthSession: (): void => {
    WebBrowser.maybeCompleteAuthSession();
  },
  openAuthSessionAsync: (url: string, redirectUri: string) => {
    return WebBrowser.openAuthSessionAsync(url, redirectUri);
  },
};

const transport = createDefaultAlbyTransport();

const currentAlbyHttp = (): AlbyHttp => {
  const alby = getMobileConfig().alby;
  return createAlbyHttp(
    {
      clientId: alby.clientId ?? '',
      authorizeUrl: alby.authorizeUrl,
      apiBaseUrl: alby.apiBaseUrl,
      redirectUri: alby.redirectUri,
    },
    transport
  );
};

const http: AlbyHttp = {
  exchangeAuthorizationCode: (input) => currentAlbyHttp().exchangeAuthorizationCode(input),
  refreshAccessToken: (refreshToken) => currentAlbyHttp().refreshAccessToken(refreshToken),
  getAccountSummary: (accessToken) => currentAlbyHttp().getAccountSummary(accessToken),
  getValue4Value: (accessToken) => currentAlbyHttp().getValue4Value(accessToken),
  sendKeysends: (accessToken, payments) => currentAlbyHttp().sendKeysends(accessToken, payments),
  payInvoice: (accessToken, invoice) => currentAlbyHttp().payInvoice(accessToken, invoice),
};

const session = createAlbySession({
  store,
  browser,
  randomBytes: (byteCount) => Crypto.getRandomBytesAsync(byteCount),
  digestBase64: (verifier) => {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
      encoding: Crypto.CryptoEncoding.BASE64,
    });
  },
  http,
  now: () => Date.now(),
  readConfig: () => getMobileConfig().alby,
});

export const {
  isAlbyConfigured,
  getAlbyAccountSnapshot,
  subscribeAlbyConnection,
  loadAlbyConnection,
  connectAlby,
  disconnectAlby,
  refreshAlbyAccount,
  sendAlbyKeysends,
  payAlbyInvoice,
} = session;

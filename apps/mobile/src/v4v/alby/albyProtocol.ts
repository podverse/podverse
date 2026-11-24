/**
 * Alby OAuth wallet protocol: PKCE, token parsing, and keysend / BOLT11 bodies.
 * Callers pass boost custom records as strings. This module does not build a boost message
 * and does not send HTTP.
 */
import { isObjectLike } from '@podverse/helpers/guards';

export const ALBY_OAUTH_SCOPE = 'account:read balance:read payments:send' as const;
export const ALBY_AUTHORIZE_URL = 'https://getalby.com/oauth';
export const ALBY_API_BASE_URL = 'https://api.getalby.com';
/** Treat the access token as expired this long before Alby's expires_in. */
export const ALBY_ACCESS_TOKEN_SKEW_MS = 60_000;
/** Keysend and BOLT11 calls. A payment can wait on a route. */
export const ALBY_PAYMENT_TIMEOUT_MS = 90_000;
/** Token exchange, refresh, summary, and value4value calls. */
export const ALBY_ACCOUNT_TIMEOUT_MS = 20_000;

const PKCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PKCE_VERIFIER_LENGTH = 64;
const PKCE_STATE_LENGTH = 32;
/**
 * Largest multiple of the alphabet size that fits in one byte. A byte at or above this is
 * discarded so the first characters are not chosen more often than the rest.
 */
const PKCE_UNBIASED_BYTE_LIMIT = 256 - (256 % PKCE_ALPHABET.length);
/** Bound a stuck byte source. A uniform source rejects a byte with probability 8/256. */
const PKCE_MAX_BYTE_READS = 1024;

export type AlbyClientConfig = {
  clientId: string;
  authorizeUrl: string;
  apiBaseUrl: string;
  redirectUri: string;
};

export type AlbyTokenSet = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtMs: number;
  scope: string;
};

export type AlbyKeysendPayment = {
  amountSats: number;
  destination: string;
  customRecords: Readonly<Record<string, string>>;
};

export type AlbyKeysendPaymentResult = {
  amountSats: number | null;
  destination: string | null;
  feeSats: number | null;
  paymentHash: string | null;
  paymentPreimage: string | null;
  /**
   * Alby's per-payment message. Null when a payment object is present and Alby sent no error.
   * `unexpected_result` when the element is neither a payment nor an error message.
   */
  errorMessage: string | null;
};

export type AlbyInvoicePaymentResult = {
  amountSats: number;
  destination: string;
  feeSats: number;
  paymentHash: string;
  paymentPreimage: string;
};

type AlbyKeysendWire = {
  amount: number;
  destination: string;
  custom_records: Record<string, string>;
};

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return isObjectLike(value) && !Array.isArray(value);
};

const readFiniteNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const nextPkceCharacter = (nextByte: () => number): string => {
  for (let attempt = 0; attempt < PKCE_MAX_BYTE_READS; attempt += 1) {
    const byte = nextByte();
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error('PKCE byte source must return an integer from 0 through 255');
    }
    if (byte >= PKCE_UNBIASED_BYTE_LIMIT) {
      continue;
    }
    const character = PKCE_ALPHABET.charAt(byte % PKCE_ALPHABET.length);
    if (character.length !== 1) {
      throw new Error('PKCE alphabet index is out of range');
    }
    return character;
  }
  throw new Error('PKCE byte source did not yield an unbiased byte');
};

const randomPkceToken = (length: number, nextByte: () => number): string => {
  let token = '';
  while (token.length < length) {
    token += nextPkceCharacter(nextByte);
  }
  return token;
};

const urlPath = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return `/${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
};

const pathSegments = (value: string): readonly string[] => {
  const parsed = urlPath(value);
  const hashIndex = parsed.indexOf('#');
  const withoutHash = hashIndex === -1 ? parsed : parsed.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  const withoutQuery = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return normalized.split('/').filter((segment) => segment.length > 0);
};

const readErrorMessage = (error: unknown): string | null => {
  if (!isJsonObject(error) || typeof error.message !== 'string') {
    return null;
  }
  return error.message;
};

const emptyKeysendResult = (errorMessage: string): AlbyKeysendPaymentResult => {
  return {
    amountSats: null,
    destination: null,
    feeSats: null,
    paymentHash: null,
    paymentPreimage: null,
    errorMessage,
  };
};

const parseKeysendElement = (element: unknown): AlbyKeysendPaymentResult => {
  if (!isJsonObject(element)) {
    return emptyKeysendResult('unexpected_result');
  }
  const keysend = isJsonObject(element.keysend) ? element.keysend : null;
  const errorMessage = readErrorMessage(element.error);
  if (keysend === null) {
    return emptyKeysendResult(errorMessage ?? 'unexpected_result');
  }
  return {
    amountSats: readFiniteNumber(keysend.amount),
    destination: readString(keysend.destination),
    feeSats: readFiniteNumber(keysend.fee),
    paymentHash: readString(keysend.payment_hash),
    paymentPreimage: readString(keysend.payment_preimage),
    errorMessage,
  };
};

export function createPkcePair(nextByte: () => number): { codeVerifier: string; state: string } {
  return {
    codeVerifier: randomPkceToken(PKCE_VERIFIER_LENGTH, nextByte),
    state: randomPkceToken(PKCE_STATE_LENGTH, nextByte),
  };
}

export function codeChallengeS256(
  verifier: string,
  sha256: (input: Uint8Array) => Uint8Array
): string {
  return bytesToBase64Url(sha256(new TextEncoder().encode(verifier)));
}

export function buildAlbyAuthorizeUrl(
  config: AlbyClientConfig,
  pair: { codeVerifier: string; state: string },
  codeChallenge: string
): string {
  const url = new URL(config.authorizeUrl);
  url.search = '';
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('scope', ALBY_OAUTH_SCOPE);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', pair.state);
  return url.toString();
}

export function parseAlbyOAuthRedirect(
  url: string,
  expectedState: string
): { code: string } | { error: 'state_mismatch' | 'missing_code' } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'state_mismatch' };
  }
  if (parsed.searchParams.get('state') !== expectedState) {
    return { error: 'state_mismatch' };
  }
  const code = parsed.searchParams.get('code');
  if (code === null || code.length === 0) {
    return { error: 'missing_code' };
  }
  return { code };
}

/**
 * True when the first two path segments are `alby` and `callback`.
 * On a custom scheme the host is the first segment, the same split deep links use.
 */
export function isAlbyOAuthCallbackPath(path: string): boolean {
  const segments = pathSegments(path);
  return segments.length === 2 && segments[0] === 'alby' && segments[1] === 'callback';
}

export function parseAlbyTokenResponse(data: unknown, nowMs: number): AlbyTokenSet | null {
  if (!isJsonObject(data)) {
    return null;
  }
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiresIn = data.expires_in;
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    return null;
  }
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return null;
  }
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAtMs: nowMs + expiresIn * 1000,
    scope: typeof data.scope === 'string' ? data.scope : '',
  };
}

export function shouldRefreshAlbyAccessToken(token: AlbyTokenSet, nowMs: number): boolean {
  return nowMs >= token.accessTokenExpiresAtMs - ALBY_ACCESS_TOKEN_SKEW_MS;
}

export function isAlbyExpiredAccessToken(status: number, data: unknown): boolean {
  return status === 401 && isJsonObject(data) && data.error === 'expired access token';
}

/**
 * Values must already be strings. A non-string is `invalid_record` and is not JSON-encoded.
 * The first failing payment rejects the whole list.
 */
export function validateAlbyKeysendPayments(
  payments: readonly AlbyKeysendPayment[]
):
  | { keysends: AlbyKeysendWire[] }
  | { error: 'empty' | 'invalid_amount' | 'invalid_destination' | 'invalid_record' } {
  if (payments.length === 0) {
    return { error: 'empty' };
  }
  const keysends: AlbyKeysendWire[] = [];
  for (const payment of payments) {
    const amount = payment.amountSats;
    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > Number.MAX_SAFE_INTEGER
    ) {
      return { error: 'invalid_amount' };
    }
    if (typeof payment.destination !== 'string') {
      return { error: 'invalid_destination' };
    }
    const destination = payment.destination.trim();
    if (destination.length === 0) {
      return { error: 'invalid_destination' };
    }
    if (!isJsonObject(payment.customRecords)) {
      return { error: 'invalid_record' };
    }
    const customRecords: Record<string, string> = {};
    for (const [key, value] of Object.entries(payment.customRecords)) {
      if (typeof value !== 'string') {
        return { error: 'invalid_record' };
      }
      customRecords[key] = value;
    }
    keysends.push({
      amount,
      destination,
      custom_records: customRecords,
    });
  }
  return { keysends };
}

export function validateAlbyInvoice(invoice: string): string | { error: 'empty' } {
  const trimmed = invoice.trim();
  if (trimmed.length === 0) {
    return { error: 'empty' };
  }
  return trimmed;
}

export function parseAlbyKeysendMultiResponse(
  data: unknown
): readonly AlbyKeysendPaymentResult[] | null {
  if (!isJsonObject(data) || !Array.isArray(data.keysends)) {
    return null;
  }
  const results: AlbyKeysendPaymentResult[] = [];
  for (const element of data.keysends) {
    results.push(parseKeysendElement(element));
  }
  return results;
}

export function parseAlbyBolt11Response(data: unknown): AlbyInvoicePaymentResult | null {
  if (!isJsonObject(data)) {
    return null;
  }
  const amount = data.amount;
  const destination = data.destination;
  const fee = data.fee;
  const paymentHash = data.payment_hash;
  const paymentPreimage = data.payment_preimage;
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    typeof destination !== 'string' ||
    typeof fee !== 'number' ||
    !Number.isFinite(fee) ||
    typeof paymentHash !== 'string' ||
    typeof paymentPreimage !== 'string'
  ) {
    return null;
  }
  return {
    amountSats: amount,
    destination,
    feeSats: fee,
    paymentHash,
    paymentPreimage,
  };
}

export function parseAlbyAccountSummary(data: unknown): { balanceSats: number | null } {
  if (!isJsonObject(data)) {
    return { balanceSats: null };
  }
  return { balanceSats: readFiniteNumber(data.balance) };
}

export function parseAlbyValue4Value(data: unknown): { lightningAddress: string | null } {
  if (!isJsonObject(data) || typeof data.lightning_address !== 'string') {
    return { lightningAddress: null };
  }
  if (data.lightning_address.length === 0) {
    return { lightningAddress: null };
  }
  return { lightningAddress: data.lightning_address };
}

/** HTTP Basic for a public client: the client id is the username and the password is empty. */
export function basicAuthHeader(clientId: string): string {
  return `Basic ${globalThis.btoa(`${clientId}:`)}`;
}

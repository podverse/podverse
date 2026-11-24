/**
 * One HTTP call per method against the Alby OAuth wallet API.
 * A non-200 response is an `AlbyProtocolError` that still carries the body.
 * Nothing here retries: a second payment POST can pay twice.
 */
import { isObjectLike } from '@podverse/helpers/guards';
import { request } from '@podverse/helpers-requests';

import type {
  AlbyClientConfig,
  AlbyInvoicePaymentResult,
  AlbyKeysendPayment,
  AlbyKeysendPaymentResult,
  AlbyTokenSet,
} from './albyProtocol';
import {
  ALBY_ACCOUNT_TIMEOUT_MS,
  ALBY_PAYMENT_TIMEOUT_MS,
  basicAuthHeader,
  parseAlbyAccountSummary,
  parseAlbyBolt11Response,
  parseAlbyKeysendMultiResponse,
  parseAlbyTokenResponse,
  parseAlbyValue4Value,
  validateAlbyInvoice,
  validateAlbyKeysendPayments,
} from './albyProtocol';

export type AlbyTransport = (input: {
  url: string;
  method: 'GET' | 'POST';
  data?: string | Readonly<Record<string, unknown>>;
  headers: Readonly<Record<string, string>>;
  timeoutMs: number;
}) => Promise<{ status: number; data: unknown }>;

export type AlbyHttp = {
  exchangeAuthorizationCode(input: { code: string; codeVerifier: string }): Promise<AlbyTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<AlbyTokenSet>;
  getAccountSummary(accessToken: string): Promise<{ balanceSats: number | null }>;
  getValue4Value(accessToken: string): Promise<{ lightningAddress: string | null }>;
  sendKeysends(
    accessToken: string,
    payments: readonly AlbyKeysendPayment[]
  ): Promise<readonly AlbyKeysendPaymentResult[]>;
  payInvoice(accessToken: string, invoice: string): Promise<AlbyInvoicePaymentResult>;
};

/**
 * Failure from one Alby call. `responseData` is the response body when the server sent one,
 * including a 401 `{ error: "expired access token" }`.
 */
export class AlbyProtocolError extends Error {
  readonly kind: 'invalid_request' | 'unexpected_response' | 'http';
  readonly httpStatus: number | null;
  readonly responseData: unknown;

  constructor(
    kind: 'invalid_request' | 'unexpected_response' | 'http',
    httpStatus: number | null,
    responseData: unknown,
    cause?: unknown
  ) {
    super(kind, cause === undefined ? undefined : { cause });
    this.name = 'AlbyProtocolError';
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.responseData = responseData;
  }
}

const jsonRecord = (fields: object): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    body[key] = value;
  }
  return body;
};

/**
 * Axios `data`, not a `body` field. An HTTP error response is returned so the caller can read
 * a 401 body. A failure with no status (network, abort) is rethrown.
 */
export function createDefaultAlbyTransport(): AlbyTransport {
  return async (input) => {
    try {
      const response = await request<unknown>(
        input.url,
        {
          method: input.method,
          headers: { ...input.headers },
          ...(input.data === undefined ? {} : { data: input.data }),
        },
        {
          controller: new AbortController(),
          timeoutMs: input.timeoutMs,
        }
      );
      return { status: response.status, data: response.data };
    } catch (error) {
      if (
        isObjectLike(error) &&
        isObjectLike(error.response) &&
        typeof error.response.status === 'number'
      ) {
        return { status: error.response.status, data: error.response.data };
      }
      throw error;
    }
  };
}

export function createAlbyHttp(config: AlbyClientConfig, transport: AlbyTransport): AlbyHttp {
  const apiUrl = (path: string): string => {
    const base = config.apiBaseUrl.endsWith('/')
      ? config.apiBaseUrl.slice(0, -1)
      : config.apiBaseUrl;
    return `${base}${path}`;
  };

  const sendOnce = async (
    input: Parameters<AlbyTransport>[0]
  ): Promise<{ status: number; data: unknown }> => {
    try {
      return await transport(input);
    } catch (error) {
      throw new AlbyProtocolError('http', null, null, error);
    }
  };

  const requireOk = (response: { status: number; data: unknown }): void => {
    if (response.status !== 200) {
      throw new AlbyProtocolError('http', response.status, response.data);
    }
  };

  const formHeaders = (): Record<string, string> => {
    return {
      Authorization: basicAuthHeader(config.clientId),
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  };

  const bearerHeaders = (accessToken: string): Record<string, string> => {
    return { Authorization: `Bearer ${accessToken}` };
  };

  const readToken = (response: { status: number; data: unknown }): AlbyTokenSet => {
    requireOk(response);
    const token = parseAlbyTokenResponse(response.data, Date.now());
    if (token === null) {
      throw new AlbyProtocolError('unexpected_response', response.status, response.data);
    }
    return token;
  };

  return {
    async exchangeAuthorizationCode({ code, codeVerifier }) {
      const response = await sendOnce({
        url: apiUrl('/oauth/token'),
        method: 'POST',
        data: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          code_verifier: codeVerifier,
          client_id: config.clientId,
        }).toString(),
        headers: formHeaders(),
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      });
      return readToken(response);
    },

    async refreshAccessToken(refreshToken) {
      const response = await sendOnce({
        url: apiUrl('/oauth/token'),
        method: 'POST',
        data: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
        }).toString(),
        headers: formHeaders(),
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      });
      return readToken(response);
    },

    async getAccountSummary(accessToken) {
      const response = await sendOnce({
        url: apiUrl('/user/summary'),
        method: 'GET',
        headers: bearerHeaders(accessToken),
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      });
      requireOk(response);
      return parseAlbyAccountSummary(response.data);
    },

    async getValue4Value(accessToken) {
      const response = await sendOnce({
        url: apiUrl('/user/value4value'),
        method: 'GET',
        headers: bearerHeaders(accessToken),
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      });
      requireOk(response);
      return parseAlbyValue4Value(response.data);
    },

    async sendKeysends(accessToken, payments) {
      const validated = validateAlbyKeysendPayments(payments);
      if ('error' in validated) {
        throw new AlbyProtocolError('invalid_request', null, null);
      }
      const response = await sendOnce({
        url: apiUrl('/payments/keysend/multi'),
        method: 'POST',
        data: jsonRecord({ keysends: validated.keysends }),
        headers: bearerHeaders(accessToken),
        timeoutMs: ALBY_PAYMENT_TIMEOUT_MS,
      });
      requireOk(response);
      const parsed = parseAlbyKeysendMultiResponse(response.data);
      if (parsed === null) {
        throw new AlbyProtocolError('unexpected_response', response.status, response.data);
      }
      return parsed;
    },

    async payInvoice(accessToken, invoice) {
      const validated = validateAlbyInvoice(invoice);
      if (typeof validated !== 'string') {
        throw new AlbyProtocolError('invalid_request', null, null);
      }
      const response = await sendOnce({
        url: apiUrl('/payments/bolt11'),
        method: 'POST',
        data: jsonRecord({ invoice: validated }),
        headers: bearerHeaders(accessToken),
        timeoutMs: ALBY_PAYMENT_TIMEOUT_MS,
      });
      requireOk(response);
      const parsed = parseAlbyBolt11Response(response.data);
      if (parsed === null) {
        throw new AlbyProtocolError('unexpected_response', response.status, response.data);
      }
      return parsed;
    },
  };
}

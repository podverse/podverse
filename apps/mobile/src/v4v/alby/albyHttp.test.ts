import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlbyTransport } from './albyHttp';
import { AlbyProtocolError, createAlbyHttp, createDefaultAlbyTransport } from './albyHttp';
import type { AlbyClientConfig } from './albyProtocol';
import { ALBY_ACCOUNT_TIMEOUT_MS, ALBY_PAYMENT_TIMEOUT_MS } from './albyProtocol';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@podverse/helpers-requests', () => ({
  request: requestMock,
}));

const config: AlbyClientConfig = {
  clientId: 'id',
  authorizeUrl: 'https://getalby.com/oauth',
  apiBaseUrl: 'https://api.getalby.com',
  redirectUri: 'podverse-next://alby/callback',
};

const tokenBody = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  scope: 'account:read balance:read payments:send',
};

type Captured = Parameters<AlbyTransport>[0];

const capturedTransport = (
  respond: (
    input: Captured
  ) => { status: number; data: unknown } | Promise<{ status: number; data: unknown }>
): { calls: Captured[]; transport: AlbyTransport } => {
  const calls: Captured[] = [];
  const transport: AlbyTransport = async (input) => {
    calls.push(input);
    return respond(input);
  };
  return { calls, transport };
};

const readCall = (calls: readonly Captured[]): Captured => {
  const call = calls[0];
  expect(call).toBeDefined();
  if (call === undefined) {
    throw new Error('missing request');
  }
  return call;
};

const readForm = (data: Captured['data']): URLSearchParams => {
  expect(typeof data).toBe('string');
  if (typeof data !== 'string') {
    throw new Error('expected a form body');
  }
  return new URLSearchParams(data);
};

const expectProtocolError = async (
  run: () => Promise<unknown>,
  expected: {
    kind: AlbyProtocolError['kind'];
    httpStatus: number | null;
    responseData: unknown;
  }
): Promise<AlbyProtocolError> => {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(AlbyProtocolError);
    if (!(error instanceof AlbyProtocolError)) {
      throw new Error('expected AlbyProtocolError', { cause: error });
    }
    expect(error.kind).toBe(expected.kind);
    expect(error.httpStatus).toBe(expected.httpStatus);
    expect(error.responseData).toEqual(expected.responseData);
    return error;
  }
  throw new Error('expected AlbyProtocolError');
};

describe('createAlbyHttp', () => {
  it('exchanges an authorization code with the client id and verifier and no client secret', async () => {
    const { calls, transport } = capturedTransport(() => ({ status: 200, data: tokenBody }));
    const http = createAlbyHttp(config, transport);
    const before = Date.now();
    const token = await http.exchangeAuthorizationCode({
      code: 'auth-code',
      codeVerifier: 'pkce-verifier',
    });
    const after = Date.now();
    const call = readCall(calls);
    const form = readForm(call.data);

    expect(calls).toHaveLength(1);
    expect(call.url).toBe('https://api.getalby.com/oauth/token');
    expect(call.method).toBe('POST');
    expect(call.timeoutMs).toBe(ALBY_ACCOUNT_TIMEOUT_MS);
    expect(call.headers.Authorization).toBe('Basic aWQ6');
    expect(call.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('auth-code');
    expect(form.get('code_verifier')).toBe('pkce-verifier');
    expect(form.get('client_id')).toBe('id');
    expect(form.get('redirect_uri')).toBe(config.redirectUri);
    expect(form.get('client_secret')).toBeNull();
    expect(String(call.data)).not.toContain('client_secret');
    expect(token.accessToken).toBe('access-token');
    expect(token.refreshToken).toBe('refresh-token');
    expect(token.accessTokenExpiresAtMs).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(token.accessTokenExpiresAtMs).toBeLessThanOrEqual(after + 3_600_000);
  });

  it('refreshes with the refresh token and the same public-client headers', async () => {
    const { calls, transport } = capturedTransport(() => ({ status: 200, data: tokenBody }));
    const http = createAlbyHttp(config, transport);
    await http.refreshAccessToken('refresh-token');
    const call = readCall(calls);
    const form = readForm(call.data);

    expect(calls).toHaveLength(1);
    expect(call.url).toBe('https://api.getalby.com/oauth/token');
    expect(call.headers.Authorization).toBe('Basic aWQ6');
    expect(call.timeoutMs).toBe(ALBY_ACCOUNT_TIMEOUT_MS);
    expect(form.get('grant_type')).toBe('refresh_token');
    expect(form.get('refresh_token')).toBe('refresh-token');
    expect(form.get('client_id')).toBe('id');
    expect(form.get('client_secret')).toBeNull();
    expect(form.get('code_verifier')).toBeNull();
  });

  it('returns a 401 as kind http and does not send a second request', async () => {
    const { calls, transport } = capturedTransport(() => ({
      status: 401,
      data: { error: 'expired access token' },
    }));
    const http = createAlbyHttp(config, transport);

    await expectProtocolError(
      () =>
        http.sendKeysends('stale', [
          { amountSats: 5, destination: 'dest', customRecords: { note: 'hi' } },
        ]),
      {
        kind: 'http',
        httpStatus: 401,
        responseData: { error: 'expired access token' },
      }
    );
    expect(calls).toHaveLength(1);
    expect(readCall(calls).url).toBe('https://api.getalby.com/payments/keysend/multi');
  });

  it('posts keysends to /payments/keysend/multi', async () => {
    const { calls, transport } = capturedTransport(() => ({
      status: 200,
      data: {
        keysends: [
          {
            keysend: {
              amount: 15,
              destination: '02abc',
              fee: 1,
              payment_hash: 'hash',
              payment_preimage: 'preimage',
            },
          },
        ],
      },
    }));
    const http = createAlbyHttp(config, transport);
    const results = await http.sendKeysends('access', [
      { amountSats: 15, destination: '  02abc  ', customRecords: { '7629169': 'thanks' } },
    ]);
    const call = readCall(calls);

    expect(calls).toHaveLength(1);
    expect(call.url).toBe('https://api.getalby.com/payments/keysend/multi');
    expect(call.method).toBe('POST');
    expect(call.timeoutMs).toBe(ALBY_PAYMENT_TIMEOUT_MS);
    expect(call.headers.Authorization).toBe('Bearer access');
    expect(call.data).toEqual({
      keysends: [
        {
          amount: 15,
          destination: '02abc',
          custom_records: { '7629169': 'thanks' },
        },
      ],
    });
    expect(results).toEqual([
      {
        amountSats: 15,
        destination: '02abc',
        feeSats: 1,
        paymentHash: 'hash',
        paymentPreimage: 'preimage',
        errorMessage: null,
      },
    ]);
  });

  it('posts a trimmed invoice to /payments/bolt11', async () => {
    const { calls, transport } = capturedTransport(() => ({
      status: 200,
      data: {
        amount: 50,
        destination: 'dest',
        fee: 1,
        payment_hash: 'hash',
        payment_preimage: 'preimage',
      },
    }));
    const http = createAlbyHttp(config, transport);
    const result = await http.payInvoice('access', '  lnbc1invoice  ');
    const call = readCall(calls);

    expect(calls).toHaveLength(1);
    expect(call.url).toBe('https://api.getalby.com/payments/bolt11');
    expect(call.method).toBe('POST');
    expect(call.timeoutMs).toBe(ALBY_PAYMENT_TIMEOUT_MS);
    expect(call.headers.Authorization).toBe('Bearer access');
    expect(call.data).toEqual({ invoice: 'lnbc1invoice' });
    expect(result.paymentPreimage).toBe('preimage');
    expect(result.amountSats).toBe(50);
  });

  it('does not call the network when keysend or invoice validation fails', async () => {
    const { calls, transport } = capturedTransport(() => {
      throw new Error('should not send');
    });
    const http = createAlbyHttp(config, transport);

    await expectProtocolError(() => http.sendKeysends('access', []), {
      kind: 'invalid_request',
      httpStatus: null,
      responseData: null,
    });
    await expectProtocolError(() => http.payInvoice('access', '   '), {
      kind: 'invalid_request',
      httpStatus: null,
      responseData: null,
    });
    expect(calls).toHaveLength(0);
  });

  it('rejects a 200 body that is not a token or a keysend list', async () => {
    const tokenTransport = capturedTransport(() => ({
      status: 200,
      data: { access_token: 'only' },
    }));
    const keysendTransport = capturedTransport(() => ({
      status: 200,
      data: { result: 'ok' },
    }));

    await expectProtocolError(
      () =>
        createAlbyHttp(config, tokenTransport.transport).exchangeAuthorizationCode({
          code: 'auth-code',
          codeVerifier: 'pkce-verifier',
        }),
      {
        kind: 'unexpected_response',
        httpStatus: 200,
        responseData: { access_token: 'only' },
      }
    );
    await expectProtocolError(
      () =>
        createAlbyHttp(config, keysendTransport.transport).sendKeysends('access', [
          { amountSats: 5, destination: 'dest', customRecords: {} },
        ]),
      {
        kind: 'unexpected_response',
        httpStatus: 200,
        responseData: { result: 'ok' },
      }
    );
    expect(tokenTransport.calls).toHaveLength(1);
    expect(keysendTransport.calls).toHaveLength(1);
  });

  it('reads summary and value4value with the account timeout and drops unknown fields', async () => {
    const summary = capturedTransport(() => ({
      status: 200,
      data: { balance: 9, currency: 'BTC' },
    }));
    const value = capturedTransport(() => ({
      status: 200,
      data: { lightning_address: 'me@getalby.com', keysend_custom_key: '696969' },
    }));

    await expect(
      createAlbyHttp(config, summary.transport).getAccountSummary('access')
    ).resolves.toEqual({ balanceSats: 9 });
    await expect(createAlbyHttp(config, value.transport).getValue4Value('access')).resolves.toEqual(
      {
        lightningAddress: 'me@getalby.com',
      }
    );

    expect(readCall(summary.calls)).toMatchObject({
      url: 'https://api.getalby.com/user/summary',
      method: 'GET',
      timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      headers: { Authorization: 'Bearer access' },
    });
    expect(readCall(summary.calls).data).toBeUndefined();
    expect(readCall(value.calls).url).toBe('https://api.getalby.com/user/value4value');
    expect(readCall(value.calls).timeoutMs).toBe(ALBY_ACCOUNT_TIMEOUT_MS);
  });

  it('turns a transport throw with no status into kind http', async () => {
    const failure = new Error('network down');
    const { calls, transport } = capturedTransport(() => {
      throw failure;
    });
    const http = createAlbyHttp(config, transport);
    const error = await expectProtocolError(() => http.getValue4Value('access'), {
      kind: 'http',
      httpStatus: null,
      responseData: null,
    });

    expect(calls).toHaveLength(1);
    expect(error.cause).toBe(failure);
  });
});

describe('createDefaultAlbyTransport', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('passes axios data and the abort timeout', async () => {
    requestMock.mockResolvedValueOnce({ status: 200, data: { ok: true } });
    const transport = createDefaultAlbyTransport();

    await expect(
      transport({
        url: 'https://api.getalby.com/oauth/token',
        method: 'POST',
        data: 'grant_type=refresh_token',
        headers: {
          Authorization: 'Basic aWQ6',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      })
    ).resolves.toEqual({ status: 200, data: { ok: true } });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [url, requestConfig, abort] = requestMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.getalby.com/oauth/token');
    expect(requestConfig).toMatchObject({
      method: 'POST',
      data: 'grant_type=refresh_token',
      headers: {
        Authorization: 'Basic aWQ6',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    expect(requestConfig).not.toHaveProperty('body');
    expect(abort).toMatchObject({ timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS });
    expect(abort.controller).toBeInstanceOf(AbortController);
  });

  it('returns an axios HTTP error body instead of throwing', async () => {
    requestMock.mockRejectedValueOnce({
      response: { status: 401, data: { error: 'expired access token' } },
    });
    const transport = createDefaultAlbyTransport();

    await expect(
      transport({
        url: 'https://api.getalby.com/user/summary',
        method: 'GET',
        headers: { Authorization: 'Bearer access' },
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      })
    ).resolves.toEqual({
      status: 401,
      data: { error: 'expired access token' },
    });
  });

  it('rethrows when the failure has no HTTP status', async () => {
    const failure = new Error('aborted');
    requestMock.mockRejectedValueOnce(failure);
    const transport = createDefaultAlbyTransport();

    await expect(
      transport({
        url: 'https://api.getalby.com/user/summary',
        method: 'GET',
        headers: { Authorization: 'Bearer access' },
        timeoutMs: ALBY_ACCOUNT_TIMEOUT_MS,
      })
    ).rejects.toBe(failure);
  });
});

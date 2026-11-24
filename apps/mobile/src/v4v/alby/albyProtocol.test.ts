import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { AlbyKeysendPayment, AlbyTokenSet } from './albyProtocol';
import {
  ALBY_ACCESS_TOKEN_SKEW_MS,
  ALBY_OAUTH_SCOPE,
  basicAuthHeader,
  buildAlbyAuthorizeUrl,
  codeChallengeS256,
  createPkcePair,
  isAlbyExpiredAccessToken,
  isAlbyOAuthCallbackPath,
  parseAlbyAccountSummary,
  parseAlbyBolt11Response,
  parseAlbyKeysendMultiResponse,
  parseAlbyOAuthRedirect,
  parseAlbyTokenResponse,
  parseAlbyValue4Value,
  shouldRefreshAlbyAccessToken,
  validateAlbyInvoice,
  validateAlbyKeysendPayments,
} from './albyProtocol';

const sha256 = (input: Uint8Array): Uint8Array => {
  return Uint8Array.from(createHash('sha256').update(input).digest());
};

const config = {
  clientId: 'id',
  authorizeUrl: 'https://getalby.com/oauth',
  apiBaseUrl: 'https://api.getalby.com',
  redirectUri: 'podverse-next://alby/callback',
};

const payment = (
  amountSats: number,
  destination: string,
  customRecords: AlbyKeysendPayment['customRecords']
): AlbyKeysendPayment => {
  return { amountSats, destination, customRecords };
};

describe('codeChallengeS256', () => {
  it('matches the RFC 7636 S256 vector', () => {
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', sha256)).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });
});

describe('createPkcePair', () => {
  it('skips biased bytes and maps 0 to A', () => {
    const bytes = [255, 250, 0];
    let index = 0;
    const pair = createPkcePair(() => {
      const byte = bytes[index % bytes.length] ?? 0;
      index += 1;
      return byte;
    });

    expect(pair.codeVerifier).toBe('A'.repeat(64));
    expect(pair.state).toBe('A'.repeat(32));
    expect(index).toBeGreaterThan(96);
  });

  it('maps the last unbiased index onto the last alphabet character', () => {
    const pair = createPkcePair(() => 61);
    expect(pair.codeVerifier).toBe('9'.repeat(64));
    expect(pair.state).toBe('9'.repeat(32));
  });

  it('rejects a byte outside 0 through 255', () => {
    expect(() => createPkcePair(() => 256)).toThrow(/0 through 255/);
  });
});

describe('buildAlbyAuthorizeUrl', () => {
  it('carries the scope, S256 challenge, redirect, and state, and no client secret', () => {
    const pair = { codeVerifier: 'verifier-not-in-the-authorize-url', state: 'abcXYZ' };
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    const built = buildAlbyAuthorizeUrl(config, pair, challenge);
    const url = new URL(built);

    expect(built.startsWith('https://getalby.com/oauth?')).toBe(true);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('id');
    expect(url.searchParams.get('scope')).toBe(ALBY_OAUTH_SCOPE);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(challenge);
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('state')).toBe('abcXYZ');
    expect(built.includes('client_secret')).toBe(false);
    expect(built.includes(pair.codeVerifier)).toBe(false);
  });
});

describe('parseAlbyOAuthRedirect', () => {
  it('returns the code when the state matches', () => {
    expect(
      parseAlbyOAuthRedirect('podverse-next://alby/callback?code=abc&state=xyz', 'xyz')
    ).toEqual({ code: 'abc' });
  });

  it('rejects a mismatched state even when a code is present', () => {
    expect(
      parseAlbyOAuthRedirect('podverse-next://alby/callback?code=abc&state=nope', 'xyz')
    ).toEqual({ error: 'state_mismatch' });
  });

  it('rejects a missing or empty code when the state matches', () => {
    expect(parseAlbyOAuthRedirect('podverse-next://alby/callback?state=xyz', 'xyz')).toEqual({
      error: 'missing_code',
    });
    expect(parseAlbyOAuthRedirect('podverse-next://alby/callback?code=&state=xyz', 'xyz')).toEqual({
      error: 'missing_code',
    });
  });
});

describe('isAlbyOAuthCallbackPath', () => {
  const cases: readonly (readonly [string, boolean])[] = [
    ['podverse-next://alby/callback', true],
    ['podverse://alby/callback?code=1&state=2', true],
    ['/alby/callback', true],
    ['/album/callback', false],
    ['/alby', false],
    ['/alby/callback/extra', false],
  ];

  it.each(cases)('%s is %s', (path, expected) => {
    expect(isAlbyOAuthCallbackPath(path)).toBe(expected);
  });
});

describe('parseAlbyTokenResponse', () => {
  it('adds expires_in seconds to now', () => {
    const nowMs = 1_700_000_000_000;
    expect(
      parseAlbyTokenResponse(
        {
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 3600,
          scope: 'account:read',
          extra: true,
        },
        nowMs
      )
    ).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiresAtMs: nowMs + 3_600_000,
      scope: 'account:read',
    });
  });

  it('returns null without a refresh token and defaults a missing scope', () => {
    expect(parseAlbyTokenResponse({ access_token: 'access', expires_in: 3600 }, 0)).toBeNull();
    expect(
      parseAlbyTokenResponse(
        { access_token: 'access', refresh_token: 'refresh', expires_in: 10 },
        1_000
      )
    ).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiresAtMs: 11_000,
      scope: '',
    });
    expect(
      parseAlbyTokenResponse({ access_token: 'access', refresh_token: 'refresh', expires_in: 0 }, 0)
    ).toBeNull();
  });
});

describe('shouldRefreshAlbyAccessToken', () => {
  const token: AlbyTokenSet = {
    accessToken: 'access',
    refreshToken: 'refresh',
    accessTokenExpiresAtMs: 1_000_000,
    scope: '',
  };

  it('is true inside the skew window and false before it', () => {
    const windowStart = token.accessTokenExpiresAtMs - ALBY_ACCESS_TOKEN_SKEW_MS;
    expect(shouldRefreshAlbyAccessToken(token, windowStart)).toBe(true);
    expect(shouldRefreshAlbyAccessToken(token, windowStart - 1)).toBe(false);
  });
});

describe('isAlbyExpiredAccessToken', () => {
  it('is true only for the 401 expired-access-token body', () => {
    expect(isAlbyExpiredAccessToken(401, { error: 'expired access token' })).toBe(true);
    expect(isAlbyExpiredAccessToken(401, { error: 'invalid token' })).toBe(false);
    expect(isAlbyExpiredAccessToken(403, { error: 'expired access token' })).toBe(false);
    expect(isAlbyExpiredAccessToken(401, { message: 'expired access token' })).toBe(false);
    expect(isAlbyExpiredAccessToken(401, null)).toBe(false);
  });
});

describe('validateAlbyKeysendPayments', () => {
  it('copies string records through unchanged and trims the destination', () => {
    expect(
      validateAlbyKeysendPayments([
        payment(21, '  03abc  ', {
          '7629169': 'thanks',
          blank: '',
          jsonish: '{"a":1}',
        }),
      ])
    ).toEqual({
      keysends: [
        {
          amount: 21,
          destination: '03abc',
          custom_records: {
            '7629169': 'thanks',
            blank: '',
            jsonish: '{"a":1}',
          },
        },
      ],
    });
    expect(validateAlbyKeysendPayments([payment(Number.MAX_SAFE_INTEGER, 'dest', {})])).toEqual({
      keysends: [
        {
          amount: Number.MAX_SAFE_INTEGER,
          destination: 'dest',
          custom_records: {},
        },
      ],
    });
  });

  it('rejects an empty list, a fractional amount, a blank destination, and a non-string record', () => {
    expect(validateAlbyKeysendPayments([])).toEqual({ error: 'empty' });
    expect(validateAlbyKeysendPayments([payment(1.5, 'dest', {})])).toEqual({
      error: 'invalid_amount',
    });
    expect(validateAlbyKeysendPayments([payment(0, 'dest', {})])).toEqual({
      error: 'invalid_amount',
    });
    expect(validateAlbyKeysendPayments([payment(Number.MAX_SAFE_INTEGER + 1, 'dest', {})])).toEqual(
      { error: 'invalid_amount' }
    );
    expect(validateAlbyKeysendPayments([payment(1, '   ', {})])).toEqual({
      error: 'invalid_destination',
    });

    const customRecords: Record<string, string> = {};
    Object.defineProperty(customRecords, 'note', { value: 1, enumerable: true });
    expect(validateAlbyKeysendPayments([payment(1, 'dest', customRecords)])).toEqual({
      error: 'invalid_record',
    });
  });
});

describe('validateAlbyInvoice', () => {
  it('trims a bolt11 string and rejects an empty one', () => {
    expect(validateAlbyInvoice('  lnbc1  ')).toBe('lnbc1');
    expect(validateAlbyInvoice('   ')).toEqual({ error: 'empty' });
  });
});

describe('parseAlbyKeysendMultiResponse', () => {
  it('keeps a success and a per-item error in order', () => {
    expect(
      parseAlbyKeysendMultiResponse({
        keysends: [
          {
            keysend: {
              amount: 100,
              destination: 'dest',
              fee: 2,
              payment_hash: 'hash',
              payment_preimage: 'preimage',
            },
          },
          { error: { message: 'no route', code: 2 } },
          { unexpected: true },
        ],
        ignored: true,
      })
    ).toEqual([
      {
        amountSats: 100,
        destination: 'dest',
        feeSats: 2,
        paymentHash: 'hash',
        paymentPreimage: 'preimage',
        errorMessage: null,
      },
      {
        amountSats: null,
        destination: null,
        feeSats: null,
        paymentHash: null,
        paymentPreimage: null,
        errorMessage: 'no route',
      },
      {
        amountSats: null,
        destination: null,
        feeSats: null,
        paymentHash: null,
        paymentPreimage: null,
        errorMessage: 'unexpected_result',
      },
    ]);
  });

  it('returns null when keysends is missing', () => {
    expect(parseAlbyKeysendMultiResponse({ payments: [] })).toBeNull();
    expect(parseAlbyKeysendMultiResponse(null)).toBeNull();
  });
});

describe('parseAlbyBolt11Response', () => {
  it('maps amount and fee and rejects a body without payment_preimage', () => {
    expect(
      parseAlbyBolt11Response({
        amount: 50,
        destination: 'dest',
        fee: 1,
        payment_hash: 'hash',
        payment_preimage: 'preimage',
        payment_request: 'lnbc',
      })
    ).toEqual({
      amountSats: 50,
      destination: 'dest',
      feeSats: 1,
      paymentHash: 'hash',
      paymentPreimage: 'preimage',
    });
    expect(
      parseAlbyBolt11Response({
        amount: 50,
        destination: 'dest',
        fee: 1,
        payment_hash: 'hash',
      })
    ).toBeNull();
  });
});

describe('parseAlbyAccountSummary', () => {
  it('reads a finite balance and ignores every other field', () => {
    expect(parseAlbyAccountSummary({ balance: 1234, currency: 'USD', unit: 'sat' })).toEqual({
      balanceSats: 1234,
    });
    expect(parseAlbyAccountSummary({ balance: 0, fiat: 1 })).toEqual({ balanceSats: 0 });
    expect(parseAlbyAccountSummary({ balance: '1234' })).toEqual({ balanceSats: null });
    expect(parseAlbyAccountSummary(null)).toEqual({ balanceSats: null });
  });
});

describe('parseAlbyValue4Value', () => {
  it('reads a lightning address and ignores keysend fields', () => {
    expect(
      parseAlbyValue4Value({
        lightning_address: 'me@getalby.com',
        keysend_custom_key: '696969',
        keysend_custom_value: 'ignored',
      })
    ).toEqual({ lightningAddress: 'me@getalby.com' });
    expect(parseAlbyValue4Value({ lightning_address: '' })).toEqual({ lightningAddress: null });
    expect(parseAlbyValue4Value({})).toEqual({ lightningAddress: null });
  });
});

describe('basicAuthHeader', () => {
  it('is Basic plus base64 of the client id and an empty password', () => {
    expect(basicAuthHeader('id')).toBe('Basic aWQ6');
  });
});

import { describe, expect, it } from 'vitest';

import { jwtExpiresInToMilliseconds, ONE_YEAR_MS } from '@podverse/helpers';

describe('jwtExpiresInToMilliseconds', () => {
  it('parses common suffixes', () => {
    expect(jwtExpiresInToMilliseconds('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(jwtExpiresInToMilliseconds('12h')).toBe(12 * 60 * 60 * 1000);
    expect(jwtExpiresInToMilliseconds('30m')).toBe(30 * 60 * 1000);
    expect(jwtExpiresInToMilliseconds('60s')).toBe(60 * 1000);
  });

  it('treats plain digits as seconds', () => {
    expect(jwtExpiresInToMilliseconds('3600')).toBe(3600 * 1000);
  });

  it('falls back to ONE_YEAR_MS on garbage input', () => {
    expect(jwtExpiresInToMilliseconds('not-a-duration')).toBe(ONE_YEAR_MS);
  });
});

/** Mirrors login JSON token exposure gate (server env + client body flag). */
function shouldExposeLoginTokenInJsonBody(
  allowFromEnv: boolean,
  body: { includeTokenInResponseBody?: unknown } | undefined
): boolean {
  return allowFromEnv && Boolean(body?.includeTokenInResponseBody);
}

describe('login token JSON exposure', () => {
  it('requires AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY and client flag', () => {
    expect(shouldExposeLoginTokenInJsonBody(false, { includeTokenInResponseBody: true })).toBe(
      false
    );
    expect(shouldExposeLoginTokenInJsonBody(true, { includeTokenInResponseBody: true })).toBe(true);
    expect(shouldExposeLoginTokenInJsonBody(true, {})).toBe(false);
  });
});

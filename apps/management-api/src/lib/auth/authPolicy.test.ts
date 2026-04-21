import { describe, expect, it } from 'vitest';

import { jwtExpiresInToMilliseconds, ONE_YEAR_MS } from '@podverse/helpers';

describe('jwtExpiresInToMilliseconds', () => {
  it('parses day suffixes including default-length sessions', () => {
    expect(jwtExpiresInToMilliseconds('1d')).toBe(24 * 60 * 60 * 1000);
    expect(jwtExpiresInToMilliseconds('365d')).toBe(ONE_YEAR_MS);
  });
});

function shouldExposeLoginTokenInJsonBody(
  allowFromEnv: boolean,
  body: { includeTokenInResponseBody?: unknown } | undefined
): boolean {
  return allowFromEnv && Boolean(body?.includeTokenInResponseBody);
}

describe('management login token JSON exposure', () => {
  it('requires env opt-in for token in response body', () => {
    expect(shouldExposeLoginTokenInJsonBody(false, { includeTokenInResponseBody: true })).toBe(
      false
    );
    expect(shouldExposeLoginTokenInJsonBody(true, { includeTokenInResponseBody: true })).toBe(true);
  });
});

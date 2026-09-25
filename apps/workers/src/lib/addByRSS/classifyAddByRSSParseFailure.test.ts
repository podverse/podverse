import { describe, expect, it } from 'vitest';

import {
  classifyAddByRSSParseFailure,
  nextRequiresCredentials,
  readUpstreamHttpFailure,
  toAuthChallenge,
} from './classifyAddByRSSParseFailure.js';

const httpError = (status: number, headers: Record<string, unknown> = {}) => ({
  message: `Request failed with status code ${status}`,
  response: { status, headers },
  config: { headers: { Authorization: 'Basic c2VjcmV0' } },
});

describe('toAuthChallenge', () => {
  it('recognizes Basic among one or several challenges', () => {
    expect(toAuthChallenge('Basic realm="feed"')).toBe('basic');
    expect(toAuthChallenge('Bearer realm="x", basic realm="feed"')).toBe('basic');
    expect(toAuthChallenge('Bearer realm="x"')).toBe('other');
    expect(toAuthChallenge(undefined)).toBe('none');
    expect(toAuthChallenge('  ')).toBe('none');
  });
});

describe('readUpstreamHttpFailure', () => {
  it('reads status and a case-insensitive WWW-Authenticate header', () => {
    expect(readUpstreamHttpFailure(httpError(401, { 'WWW-Authenticate': 'Basic' }))).toEqual({
      httpStatus: 401,
      authChallenge: 'basic',
    });
  });

  it('returns no status for errors without a response', () => {
    expect(readUpstreamHttpFailure(new Error('getaddrinfo ENOTFOUND'))).toEqual({
      authChallenge: 'none',
    });
  });

  it('never surfaces the request Authorization header', () => {
    const result = readUpstreamHttpFailure(httpError(401));
    expect(JSON.stringify(result)).not.toContain('c2VjcmV0');
  });
});

describe('classifyAddByRSSParseFailure', () => {
  it('reports rejected credentials on 401 or 403 after sending them', () => {
    expect(
      classifyAddByRSSParseFailure({ error: httpError(401), credentialsState: 'sent' })
    ).toMatchObject({ failureReason: 'credentials_rejected', httpStatus: 401 });
    expect(
      classifyAddByRSSParseFailure({ error: httpError(403), credentialsState: 'sent' })
    ).toMatchObject({ failureReason: 'credentials_rejected', httpStatus: 403 });
  });

  it('reports required credentials on a Basic 401 when none were sent', () => {
    expect(
      classifyAddByRSSParseFailure({
        error: httpError(401, { 'www-authenticate': 'Basic realm="feed"' }),
        credentialsState: 'not_provided',
      })
    ).toEqual({ failureReason: 'credentials_required', httpStatus: 401, authChallenge: 'basic' });
  });

  it('treats a 401 with only a non-Basic challenge as an HTTP error', () => {
    expect(
      classifyAddByRSSParseFailure({
        error: httpError(401, { 'www-authenticate': 'Bearer' }),
        credentialsState: 'not_provided',
      })
    ).toMatchObject({ failureReason: 'http_error', authChallenge: 'other' });
  });

  it('keeps the withheld reason whatever the origin answered', () => {
    expect(
      classifyAddByRSSParseFailure({
        error: httpError(401, { 'www-authenticate': 'Basic' }),
        credentialsState: 'withheld_other_domain',
      })
    ).toMatchObject({ failureReason: 'credentials_withheld_other_domain', httpStatus: 401 });
    expect(
      classifyAddByRSSParseFailure({
        error: Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
        credentialsState: 'withheld_insecure',
      })
    ).toMatchObject({ failureReason: 'credentials_withheld_insecure' });
  });

  it('reports an unopenable envelope ahead of anything else', () => {
    expect(
      classifyAddByRSSParseFailure({ error: httpError(401), credentialsState: 'decrypt_failed' })
    ).toMatchObject({ failureReason: 'credentials_envelope_invalid' });
  });

  it('falls back to http_error, network, and parse', () => {
    expect(
      classifyAddByRSSParseFailure({ error: httpError(404), credentialsState: 'sent' })
    ).toMatchObject({ failureReason: 'http_error', httpStatus: 404 });
    expect(
      classifyAddByRSSParseFailure({
        error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }),
        credentialsState: 'not_provided',
      })
    ).toEqual({ failureReason: 'network', authChallenge: 'none' });
    expect(
      classifyAddByRSSParseFailure({
        error: new Error('Unexpected close tag'),
        credentialsState: 'not_provided',
      })
    ).toEqual({ failureReason: 'parse', authChallenge: 'none' });
    expect(classifyAddByRSSParseFailure({ credentialsState: 'not_provided' })).toEqual({
      failureReason: 'parse',
      authChallenge: 'none',
    });
  });
});

describe('nextRequiresCredentials', () => {
  it('clears the flag after an anonymous success and leaves it after an authenticated one', () => {
    expect(nextRequiresCredentials({ status: 'succeeded', credentialsState: 'not_provided' })).toBe(
      false
    );
    expect(
      nextRequiresCredentials({ status: 'succeeded', credentialsState: 'sent' })
    ).toBeUndefined();
  });

  it('sets the flag when the origin demands or rejects credentials', () => {
    expect(nextRequiresCredentials({ status: 'failed', failureReason: 'credentials_required' })).toBe(
      true
    );
    expect(nextRequiresCredentials({ status: 'failed', failureReason: 'credentials_rejected' })).toBe(
      true
    );
    expect(nextRequiresCredentials({ status: 'failed', failureReason: 'network' })).toBeUndefined();
  });
});

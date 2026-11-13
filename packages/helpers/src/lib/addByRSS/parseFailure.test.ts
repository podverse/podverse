import { describe, expect, it } from 'vitest';

import { resolveAddByRSSParseFailureReason, toAddByRSSAuthChallenge } from './parseFailure.js';

describe('toAddByRSSAuthChallenge', () => {
  it('recognizes Basic among one or several challenges', () => {
    expect(toAddByRSSAuthChallenge('Basic realm="feed"')).toBe('basic');
    expect(toAddByRSSAuthChallenge('Bearer realm="x", basic realm="feed"')).toBe('basic');
    expect(toAddByRSSAuthChallenge('Bearer realm="x"')).toBe('other');
    expect(toAddByRSSAuthChallenge(undefined)).toBe('none');
    expect(toAddByRSSAuthChallenge('  ')).toBe('none');
    expect(toAddByRSSAuthChallenge(null)).toBe('none');
  });
});

describe('resolveAddByRSSParseFailureReason', () => {
  it('reports an unopenable envelope ahead of the status', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'basic',
        credentialsState: 'decrypt_failed',
        httpStatus: 401,
        transportError: false,
      })
    ).toBe('credentials_envelope_invalid');
  });

  it('reports rejected credentials on 401 or 403 after sending them', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'basic',
        credentialsState: 'sent',
        httpStatus: 401,
        transportError: false,
      })
    ).toBe('credentials_rejected');
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'none',
        credentialsState: 'sent',
        httpStatus: 403,
        transportError: false,
      })
    ).toBe('credentials_rejected');
  });

  it('keeps a withheld-other-domain reason when the origin answers 401', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'basic',
        credentialsState: 'withheld_other_domain',
        httpStatus: 401,
        transportError: false,
      })
    ).toBe('credentials_withheld_other_domain');
  });

  it('keeps a withheld-insecure reason when the request never got an answer', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'none',
        credentialsState: 'withheld_insecure',
        transportError: true,
      })
    ).toBe('credentials_withheld_insecure');
  });

  it('requires credentials on a 401 that is not a non-Basic challenge', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'basic',
        credentialsState: 'not_provided',
        httpStatus: 401,
        transportError: false,
      })
    ).toBe('credentials_required');
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'none',
        credentialsState: 'not_provided',
        httpStatus: 401,
        transportError: false,
      })
    ).toBe('credentials_required');
  });

  it('reports an HTTP error for other statuses, including a non-Basic 401', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'none',
        credentialsState: 'sent',
        httpStatus: 404,
        transportError: false,
      })
    ).toBe('http_error');
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'other',
        credentialsState: 'not_provided',
        httpStatus: 401,
        transportError: false,
      })
    ).toBe('http_error');
  });

  it('reports a transport failure when the host never answered', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'none',
        credentialsState: 'not_provided',
        transportError: true,
      })
    ).toBe('network');
  });

  it('reports parse when there is no status and no transport error', () => {
    expect(
      resolveAddByRSSParseFailureReason({
        authChallenge: 'none',
        credentialsState: 'not_provided',
        transportError: false,
      })
    ).toBe('parse');
  });
});

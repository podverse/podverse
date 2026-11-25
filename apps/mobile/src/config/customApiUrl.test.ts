import { describe, expect, it } from 'vitest';

import {
  acceptStoredCustomApiBaseUrl,
  customApiCommitOpensClearScreen,
  customApiHealthUrl,
  judgeCustomApiHealthResponse,
  normalizeCustomApiBaseUrl,
  planCustomApiCommit,
  readWebOriginFromHealthBody,
  resolvePublicWebBaseUrl,
} from './customApiUrl';

const BUILT_IN = 'http://localhost:4230/api/v2';
const CUSTOM = 'https://example.com/api/v2';

describe('normalizeCustomApiBaseUrl', () => {
  it('accepts http and https addresses that end with /api and a version', () => {
    expect(normalizeCustomApiBaseUrl('  https://example.com/api/v2/  ')).toBe(CUSTOM);
    expect(normalizeCustomApiBaseUrl('http://127.0.0.1:3000/api/v2')).toBe(
      'http://127.0.0.1:3000/api/v2'
    );
  });

  it('canonicalizes host case and drops a trailing slash', () => {
    expect(normalizeCustomApiBaseUrl('https://Example.com/api/v2/')).toBe(CUSTOM);
  });

  it('rejects empty text, userinfo, query, hash, and a path that is not an API version', () => {
    expect(normalizeCustomApiBaseUrl('')).toBeNull();
    expect(normalizeCustomApiBaseUrl('   ')).toBeNull();
    expect(normalizeCustomApiBaseUrl('https://user:secret@example.com/api/v2')).toBeNull();
    expect(normalizeCustomApiBaseUrl('https://example.com/api/v2?token=1')).toBeNull();
    expect(normalizeCustomApiBaseUrl('https://example.com/api/v2#section')).toBeNull();
    expect(normalizeCustomApiBaseUrl('ftp://example.com/api/v2')).toBeNull();
    expect(normalizeCustomApiBaseUrl('https://example.com/v2')).toBeNull();
    expect(normalizeCustomApiBaseUrl('not-a-url')).toBeNull();
    expect(normalizeCustomApiBaseUrl('pvngtest@bobot.lol')).toBeNull();
  });
});

describe('acceptStoredCustomApiBaseUrl', () => {
  it('drops a stored value that is the build address', () => {
    expect(acceptStoredCustomApiBaseUrl(`${BUILT_IN}/`, BUILT_IN)).toBeNull();
    expect(acceptStoredCustomApiBaseUrl(CUSTOM, BUILT_IN)).toBe(CUSTOM);
    expect(acceptStoredCustomApiBaseUrl(null, BUILT_IN)).toBeNull();
    expect(acceptStoredCustomApiBaseUrl('not-a-url', BUILT_IN)).toBeNull();
  });
});

describe('planCustomApiCommit', () => {
  it('leaves an empty field alone when nothing is saved', () => {
    expect(planCustomApiCommit('', null, BUILT_IN)).toEqual({ action: 'unchanged' });
  });

  it('clears a saved override when the field is empty or matches the build address', () => {
    expect(planCustomApiCommit('', CUSTOM, BUILT_IN)).toEqual({ action: 'clear' });
    expect(planCustomApiCommit(BUILT_IN, CUSTOM, BUILT_IN)).toEqual({ action: 'clear' });
  });

  it('rejects a malformed address before any request', () => {
    expect(planCustomApiCommit('not-a-url', null, BUILT_IN)).toEqual({ action: 'invalid' });
    expect(planCustomApiCommit('pvngtest@bobot.lol', null, BUILT_IN)).toEqual({
      action: 'invalid',
    });
  });

  it('does nothing when the field already matches the saved override', () => {
    expect(planCustomApiCommit(CUSTOM, CUSTOM, BUILT_IN)).toEqual({ action: 'unchanged' });
  });

  it('probes a different well-formed address', () => {
    expect(planCustomApiCommit(CUSTOM, null, BUILT_IN)).toEqual({
      action: 'probe',
      baseUrl: CUSTOM,
    });
  });
});

describe('customApiCommitOpensClearScreen', () => {
  it('is true only when the saved address would change', () => {
    expect(customApiCommitOpensClearScreen({ action: 'clear' })).toBe(true);
    expect(customApiCommitOpensClearScreen({ action: 'probe', baseUrl: CUSTOM })).toBe(true);
    expect(customApiCommitOpensClearScreen({ action: 'unchanged' })).toBe(false);
    expect(customApiCommitOpensClearScreen({ action: 'invalid' })).toBe(false);
  });
});

describe('judgeCustomApiHealthResponse', () => {
  it('accepts status 200 with a JSON status of ok', () => {
    expect(
      judgeCustomApiHealthResponse(200, { status: 'ok', message: 'The server is running.' })
    ).toEqual({
      kind: 'ok',
    });
    expect(
      judgeCustomApiHealthResponse(200, { status: 'ok', webOrigin: 'https://pv.example' })
    ).toEqual({
      kind: 'ok',
    });
    expect(judgeCustomApiHealthResponse(200, { status: 'ok', webOrigin: null })).toEqual({
      kind: 'ok',
    });
  });

  it('rejects a 200 that is not the health body', () => {
    expect(judgeCustomApiHealthResponse(200, '<html></html>')).toEqual({ kind: 'unexpected_body' });
    expect(judgeCustomApiHealthResponse(200, { status: 'unavailable' })).toEqual({
      kind: 'unexpected_body',
    });
  });

  it('rejects any status other than 200, including redirects', () => {
    expect(judgeCustomApiHealthResponse(404, { status: 'ok' })).toEqual({
      kind: 'unexpected_status',
      status: 404,
    });
    expect(judgeCustomApiHealthResponse(302, undefined)).toEqual({
      kind: 'unexpected_status',
      status: 302,
    });
  });
});

describe('customApiHealthUrl', () => {
  it('appends /health to the versioned base', () => {
    expect(customApiHealthUrl(CUSTOM)).toBe('https://example.com/api/v2/health');
  });
});

describe('readWebOriginFromHealthBody', () => {
  it('reads an http or https origin and drops a trailing slash', () => {
    expect(readWebOriginFromHealthBody({ status: 'ok', webOrigin: 'https://pv.example/' })).toBe(
      'https://pv.example'
    );
    expect(readWebOriginFromHealthBody({ webOrigin: 'http://localhost:3000' })).toBe(
      'http://localhost:3000'
    );
  });

  it('returns null when the field is missing, null, or not an origin', () => {
    expect(readWebOriginFromHealthBody({ status: 'ok' })).toBeNull();
    expect(readWebOriginFromHealthBody({ webOrigin: null })).toBeNull();
    expect(readWebOriginFromHealthBody({ webOrigin: 'https://pv.example/episode' })).toBeNull();
    expect(readWebOriginFromHealthBody(null)).toBeNull();
  });
});

describe('resolvePublicWebBaseUrl', () => {
  it('uses the build origin when no custom API is saved', () => {
    expect(resolvePublicWebBaseUrl('https://example.test/', null, null)).toBe(
      'https://example.test'
    );
    expect(resolvePublicWebBaseUrl(null, null, 'https://pv.example')).toBeNull();
  });

  it('uses the stored origin while a custom API is saved', () => {
    expect(resolvePublicWebBaseUrl('https://example.test', CUSTOM, 'https://pv.example/')).toBe(
      'https://pv.example'
    );
  });

  it('returns null when a custom API saved no website origin', () => {
    expect(resolvePublicWebBaseUrl('https://example.test', CUSTOM, null)).toBeNull();
    expect(resolvePublicWebBaseUrl('https://example.test', CUSTOM, 'not-a-url')).toBeNull();
  });
});

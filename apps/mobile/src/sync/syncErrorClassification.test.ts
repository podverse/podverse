import { describe, expect, it } from 'vitest';

import { classifySyncError, SyncJobTimeoutError } from './syncErrorClassification';

/** Shaped like what axios throws, which is the only failure shape the sync jobs produce. */
const responseError = (status: number, data: unknown = undefined): unknown => {
  const error = new Error(`Request failed with status code ${status}`);
  return Object.assign(error, { response: { data, status } });
};

describe('classifySyncError', () => {
  it('keeps both the status and the API body code, so a 403 says which 403 it was', () => {
    const error = responseError(403, {
      code: 'membership_required',
      message: 'Membership required',
    });
    expect(classifySyncError(error)).toEqual({
      code: 'http_403:membership_required',
      isOffline: false,
    });
  });

  it('falls back to the status when the body names nothing', () => {
    expect(classifySyncError(responseError(401))).toEqual({ code: 'http_401', isOffline: false });
    expect(classifySyncError(responseError(500, { message: 'Server error' }))).toEqual({
      code: 'http_500',
      isOffline: false,
    });
  });

  it('treats a server that answered as reachable, even at 5xx', () => {
    // Continuing the run is reasonable when the server is talking to us; only silence pauses it.
    expect(classifySyncError(responseError(503)).isOffline).toBe(false);
  });

  it('reports a request that never got a response as offline', () => {
    const error = Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
    expect(classifySyncError(error)).toEqual({ code: 'err_network', isOffline: true });
  });

  it('recognizes an offline failure from its message when it carries no code', () => {
    expect(classifySyncError(new Error('Network request failed'))).toEqual({
      code: 'network_unreachable',
      isOffline: true,
    });
  });

  it('names a job that outlived its budget', () => {
    expect(classifySyncError(new SyncJobTimeoutError('subscriptions-page', 20000))).toEqual({
      code: 'sync_job_timeout',
      isOffline: false,
    });
  });

  it('still produces a quotable code for a failure it cannot place', () => {
    expect(classifySyncError(new Error('Something went sideways'))).toEqual({
      code: 'unknown',
      isOffline: false,
    });
    expect(classifySyncError('not an error')).toEqual({ code: 'unknown', isOffline: false });
  });
});

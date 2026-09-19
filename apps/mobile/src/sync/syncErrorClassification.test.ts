import { describe, expect, it } from 'vitest';

import { OfflineModeEnabledError } from '../prefs/offlineMode';
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
      isServerUnreachable: false,
    });
  });

  it('falls back to the status when the body names nothing', () => {
    expect(classifySyncError(responseError(401))).toEqual({
      code: 'http_401',
      isOffline: false,
      isServerUnreachable: false,
    });
    expect(classifySyncError(responseError(500, { message: 'Server error' }))).toEqual({
      code: 'http_500',
      isOffline: false,
      isServerUnreachable: false,
    });
  });

  it('treats a server that answered as reached, even at 5xx', () => {
    // A 500 is the app failing at its job, not the network failing to carry the request.
    expect(classifySyncError(responseError(500)).isOffline).toBe(false);
    expect(classifySyncError(responseError(500)).isServerUnreachable).toBe(false);
  });

  it('marks the gateway statuses as the server being unreachable', () => {
    for (const status of [502, 503, 504]) {
      expect(classifySyncError(responseError(status))).toEqual({
        code: `http_${status}`,
        // Something answered, so this is not silence — but the run should still park.
        isOffline: false,
        isServerUnreachable: true,
      });
    }
  });

  it('keeps the body code on a gateway status too', () => {
    expect(classifySyncError(responseError(503, { code: 'maintenance' }))).toEqual({
      code: 'http_503:maintenance',
      isOffline: false,
      isServerUnreachable: true,
    });
  });

  it('reports a request that never got a response as offline, not as the server being down', () => {
    const error = Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
    expect(classifySyncError(error)).toEqual({
      code: 'err_network',
      isOffline: true,
      isServerUnreachable: false,
    });
  });

  it('recognizes an offline failure from its message when it carries no code', () => {
    expect(classifySyncError(new Error('Network request failed'))).toEqual({
      code: 'network_unreachable',
      isOffline: true,
      isServerUnreachable: false,
    });
  });

  it('names a job that outlived its budget', () => {
    expect(classifySyncError(new SyncJobTimeoutError('subscriptions-page', 20000))).toEqual({
      code: 'sync_job_timeout',
      isOffline: false,
      isServerUnreachable: false,
    });
  });

  it('treats Offline Mode as an offline state, not a server fault', () => {
    expect(classifySyncError(new OfflineModeEnabledError())).toEqual({
      code: 'offline_mode',
      isOffline: true,
      isServerUnreachable: false,
    });
  });

  it('still produces a quotable code for a failure it cannot place', () => {
    expect(classifySyncError(new Error('Something went sideways'))).toEqual({
      code: 'unknown',
      isOffline: false,
      isServerUnreachable: false,
    });
    expect(classifySyncError('not an error')).toEqual({
      code: 'unknown',
      isOffline: false,
      isServerUnreachable: false,
    });
  });
});

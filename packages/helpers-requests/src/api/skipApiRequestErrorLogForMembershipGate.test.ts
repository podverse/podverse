import { describe, expect, it, vi } from 'vitest';

import { ApiRequestService } from './_request.js';
import { skipApiRequestErrorLogForMembershipGate } from './skipApiRequestErrorLogForMembershipGate.js';

vi.mock('../_request.js', () => ({
  request: vi.fn(),
}));

import { request } from '../_request.js';

describe('skipApiRequestErrorLogForMembershipGate', () => {
  it('returns true for 403 with membership i18nKey', () => {
    expect(
      skipApiRequestErrorLogForMembershipGate({
        status: 403,
        responseData: { i18nKey: 'membership.feature_not_available_for_account_type' },
      })
    ).toBe(true);
    expect(
      skipApiRequestErrorLogForMembershipGate({
        status: 403,
        responseData: { i18nKey: 'membership.membership_expired' },
      })
    ).toBe(true);
  });

  it('returns false for other statuses or payloads', () => {
    expect(
      skipApiRequestErrorLogForMembershipGate({
        status: 403,
        responseData: { message: 'Forbidden' },
      })
    ).toBe(false);
    expect(
      skipApiRequestErrorLogForMembershipGate({
        status: 500,
        responseData: { i18nKey: 'membership.feature_not_available_for_account_type' },
      })
    ).toBe(false);
    expect(skipApiRequestErrorLogForMembershipGate({ status: 403 })).toBe(false);
  });
});

describe('ApiRequestService apiRequest console logging', () => {
  it('does not console.error on membership-gate 403', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 403,
        data: {
          i18nKey: 'membership.feature_not_available_for_account_type',
          message: 'Your account does not currently have access to this feature.',
        },
      },
      config: { url: 'http://localhost/v1/x', method: 'post' },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v1',
    });

    await expect(svc.apiRequest({ path: '/mq/rss/add/on-demand', method: 'POST' })).rejects.toBe(
      error
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('still console.errors on 403 without membership i18nKey', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
      config: { url: 'http://localhost/v1/x', method: 'post' },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v1',
    });

    await expect(svc.apiRequest({ path: '/other', method: 'GET' })).rejects.toBe(error);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

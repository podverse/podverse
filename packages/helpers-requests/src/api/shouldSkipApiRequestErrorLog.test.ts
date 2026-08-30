import { describe, expect, it, vi } from 'vitest';

import { ApiRequestService } from './_request.js';
import { isFeedContentApiPath } from './feedContentApiPathPrefixes.js';
import { shouldSkipApiRequestErrorLog } from './shouldSkipApiRequestErrorLog.js';
import { skipApiRequestErrorLogForAccountNotFound } from './skipApiRequestErrorLogForAccountNotFound.js';
import { skipApiRequestErrorLogForFeedContentNotFound } from './skipApiRequestErrorLogForFeedContentNotFound.js';
import { skipApiRequestErrorLogForMembershipGate } from './skipApiRequestErrorLogForMembershipGate.js';
import { skipApiRequestErrorLogForMembershipPricing } from './skipApiRequestErrorLogForMembershipPricing.js';

vi.mock('../_request.js', () => ({
  request: vi.fn(),
}));

import { request } from '../_request.js';

describe('isFeedContentApiPath', () => {
  it('matches feed catalog path prefixes', () => {
    expect(isFeedContentApiPath('/item/mp-scenario-vts-remote')).toBe(true);
    expect(isFeedContentApiPath('/item-chapter/standard-chapter')).toBe(true);
    expect(isFeedContentApiPath('/channel/bad-id')).toBe(true);
    expect(isFeedContentApiPath('/category')).toBe(true);
    expect(isFeedContentApiPath('/category/1')).toBe(true);
    expect(isFeedContentApiPath('/publisher-feed/channel/foo')).toBe(true);
  });

  it('does not match non-feed routes', () => {
    expect(isFeedContentApiPath('/account/me')).toBe(false);
    expect(isFeedContentApiPath('/clip/foo')).toBe(false);
    expect(isFeedContentApiPath('/playlist/bar')).toBe(false);
  });
});

describe('skipApiRequestErrorLogForFeedContentNotFound', () => {
  it('returns true for 404 on feed content paths', () => {
    expect(
      skipApiRequestErrorLogForFeedContentNotFound({ status: 404 }, '/item/mp-scenario-vts-remote')
    ).toBe(true);
    expect(
      skipApiRequestErrorLogForFeedContentNotFound(
        { status: 404 },
        '/item-chapter/standard-chapter'
      )
    ).toBe(true);
    expect(skipApiRequestErrorLogForFeedContentNotFound({ status: 404 }, '/channel/bad-id')).toBe(
      true
    );
  });

  it('returns false for non-404 or non-feed paths', () => {
    expect(skipApiRequestErrorLogForFeedContentNotFound({ status: 404 }, '/account/me')).toBe(
      false
    );
    expect(skipApiRequestErrorLogForFeedContentNotFound({ status: 500 }, '/item/foo')).toBe(false);
  });
});

describe('skipApiRequestErrorLogForAccountNotFound', () => {
  it('returns true for 404 Account not found on account by id_text paths', () => {
    expect(
      skipApiRequestErrorLogForAccountNotFound(
        { status: 404, responseData: { message: 'Account not found' } },
        '/account/e2e-seo-private-profile-placeholder'
      )
    ).toBe(true);
  });

  it('returns false for other account paths, messages, or statuses', () => {
    expect(
      skipApiRequestErrorLogForAccountNotFound(
        { status: 404, responseData: { message: 'Not found' } },
        '/account/me'
      )
    ).toBe(false);
    expect(
      skipApiRequestErrorLogForAccountNotFound(
        { status: 404, responseData: { message: 'Account not found' } },
        '/account/subscribed/az'
      )
    ).toBe(false);
    expect(
      skipApiRequestErrorLogForAccountNotFound(
        { status: 500, responseData: { message: 'Account not found' } },
        '/account/foo'
      )
    ).toBe(false);
  });
});

describe('skipApiRequestErrorLogForMembershipPricing', () => {
  it('returns true for the expected disabled-pricing response', () => {
    expect(
      skipApiRequestErrorLogForMembershipPricing(
        {
          status: 400,
          responseData: { message: 'Paid premium memberships are not enabled for this server' },
        },
        '/product/membership/pricing'
      )
    ).toBe(true);
  });

  it('returns false for other pricing responses', () => {
    expect(
      skipApiRequestErrorLogForMembershipPricing(
        { status: 500, responseData: { message: 'Paid premium memberships are not enabled for this server' } },
        '/product/membership/pricing'
      )
    ).toBe(false);
    expect(
      skipApiRequestErrorLogForMembershipPricing(
        { status: 400, responseData: { message: 'Other error' } },
        '/product/membership/pricing'
      )
    ).toBe(false);
  });
});

describe('shouldSkipApiRequestErrorLog', () => {
  it('combines membership gate, feed content, account not-found, and pricing skips', () => {
    expect(
      shouldSkipApiRequestErrorLog(
        {
          status: 403,
          responseData: { i18nKey: 'membership.feature_not_available_for_account_type' },
        },
        '/mq/rss/add/on-demand'
      )
    ).toBe(true);
    expect(shouldSkipApiRequestErrorLog({ status: 404 }, '/item/foo')).toBe(true);
    expect(
      shouldSkipApiRequestErrorLog(
        { status: 404, responseData: { message: 'Account not found' } },
        '/account/missing-profile'
      )
    ).toBe(true);
    expect(
      shouldSkipApiRequestErrorLog(
        {
          status: 400,
          responseData: { message: 'Paid premium memberships are not enabled for this server' },
        },
        '/product/membership/pricing'
      )
    ).toBe(true);
    expect(shouldSkipApiRequestErrorLog({ status: 404 }, '/account/me')).toBe(false);
    expect(shouldSkipApiRequestErrorLog({ status: 500 }, '/item/foo')).toBe(false);
  });
});

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

  it('does not console.error on feed content 404', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 404,
        data: { message: 'Item not found' },
      },
      config: { url: 'http://localhost/v2/item/mp-scenario-vts-remote', method: 'get' },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v2',
    });

    await expect(
      svc.apiRequest({ path: '/item/mp-scenario-vts-remote', method: 'GET' })
    ).rejects.toBe(error);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not console.error on item-chapter feed content 404', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 404,
        data: { message: 'Item chapter not found' },
      },
      config: { url: 'http://localhost/v2/item-chapter/standard-chapter', method: 'get' },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v2',
    });

    await expect(
      svc.apiRequest({ path: '/item-chapter/standard-chapter', method: 'GET' })
    ).rejects.toBe(error);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('still console.errors on 404 for non-feed routes', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 404,
        data: { message: 'Not found' },
      },
      config: { url: 'http://localhost/v2/account/me', method: 'get' },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v2',
    });

    await expect(svc.apiRequest({ path: '/account/me', method: 'GET' })).rejects.toBe(error);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('does not console.error on account by id_text 404 Account not found', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 404,
        data: { message: 'Account not found' },
      },
      config: {
        url: 'http://localhost/v2/account/e2e-seo-private-profile-placeholder',
        method: 'get',
      },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v2',
    });

    await expect(
      svc.apiRequest({
        path: '/account/e2e-seo-private-profile-placeholder',
        method: 'GET',
      })
    ).rejects.toBe(error);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('still console.errors on 500 for feed content paths', async () => {
    const requestMock = vi.mocked(request);
    const error = Object.assign(new Error('Request failed'), {
      response: {
        status: 500,
        data: { message: 'Internal server error' },
      },
      config: { url: 'http://localhost/v2/item/foo', method: 'get' },
    });
    requestMock.mockRejectedValueOnce(error);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const svc = new ApiRequestService({
      protocol: 'http',
      host: 'localhost',
      prefix: '',
      version: '/v2',
    });

    await expect(svc.apiRequest({ path: '/item/foo', method: 'GET' })).rejects.toBe(error);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

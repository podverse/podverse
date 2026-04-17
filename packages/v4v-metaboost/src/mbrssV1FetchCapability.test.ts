import { describe, expect, it, vi } from 'vitest';

import {
  fetchMbrssV1BoostCapability,
  parseMbrssV1BoostCapabilityResponse,
} from './mbrssV1FetchCapability.js';

const validPayload = {
  schema: 'mbrss-v1',
  message_char_limit: 500,
  terms_of_service_url: 'https://example.com/terms',
};

describe('parseMbrssV1BoostCapabilityResponse', () => {
  it('returns messageCharLimit and termsOfServiceUrl for valid mbrss-v1 payload', () => {
    expect(parseMbrssV1BoostCapabilityResponse(validPayload)).toEqual({
      messageCharLimit: 500,
      termsOfServiceUrl: 'https://example.com/terms',
    });
  });

  it('floors non-integer limits', () => {
    expect(
      parseMbrssV1BoostCapabilityResponse({
        ...validPayload,
        message_char_limit: 499.7,
      })
    ).toEqual({
      messageCharLimit: 499,
      termsOfServiceUrl: 'https://example.com/terms',
    });
  });

  it('rejects wrong schema', () => {
    expect(() =>
      parseMbrssV1BoostCapabilityResponse({
        ...validPayload,
        schema: 'other',
      })
    ).toThrow('mbrss-v1');
  });

  it('rejects invalid limit', () => {
    expect(() =>
      parseMbrssV1BoostCapabilityResponse({ ...validPayload, message_char_limit: NaN })
    ).toThrow();
    expect(() =>
      parseMbrssV1BoostCapabilityResponse({ ...validPayload, message_char_limit: -1 })
    ).toThrow();
  });

  it('rejects invalid terms URL', () => {
    expect(() =>
      parseMbrssV1BoostCapabilityResponse({ ...validPayload, terms_of_service_url: '' })
    ).toThrow();
    expect(() =>
      parseMbrssV1BoostCapabilityResponse({ ...validPayload, terms_of_service_url: 'not-a-url' })
    ).toThrow();
  });
});

describe('fetchMbrssV1BoostCapability', () => {
  it('calls GET and parses body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schema: 'mbrss-v1',
        message_char_limit: 1200,
        terms_of_service_url: 'https://example.com/tos',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMbrssV1BoostCapability(
      'https://api.example.com/v1/s/mbrss-v1/boost/abc/'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/standard/mbrss-v1/boost/abc/',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );
    expect(result).toEqual({
      messageCharLimit: 1200,
      termsOfServiceUrl: 'https://example.com/tos',
    });

    vi.unstubAllGlobals();
  });

  it('throws on non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        json: async () => ({}),
      })
    );

    await expect(
      fetchMbrssV1BoostCapability('https://api.example.com/v1/s/mbrss-v1/boost/missing/')
    ).rejects.toThrow('404');

    vi.unstubAllGlobals();
  });
});

import { describe, expect, it, vi } from 'vitest';

import { fetchMb1BoostCapability, parseMb1BoostCapabilityResponse } from './mb1FetchCapability.js';

const validPayload = {
  schema: 'mb1',
  message_char_limit: 500,
  terms_of_service_url: 'https://example.com/terms',
};

describe('parseMb1BoostCapabilityResponse', () => {
  it('returns messageCharLimit and termsOfServiceUrl for valid mb1 payload', () => {
    expect(parseMb1BoostCapabilityResponse(validPayload)).toEqual({
      messageCharLimit: 500,
      termsOfServiceUrl: 'https://example.com/terms',
    });
  });

  it('floors non-integer limits', () => {
    expect(
      parseMb1BoostCapabilityResponse({
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
      parseMb1BoostCapabilityResponse({
        ...validPayload,
        schema: 'other',
      })
    ).toThrow('mb1');
  });

  it('rejects invalid limit', () => {
    expect(() =>
      parseMb1BoostCapabilityResponse({ ...validPayload, message_char_limit: NaN })
    ).toThrow();
    expect(() =>
      parseMb1BoostCapabilityResponse({ ...validPayload, message_char_limit: -1 })
    ).toThrow();
  });

  it('rejects invalid terms URL', () => {
    expect(() =>
      parseMb1BoostCapabilityResponse({ ...validPayload, terms_of_service_url: '' })
    ).toThrow();
    expect(() =>
      parseMb1BoostCapabilityResponse({ ...validPayload, terms_of_service_url: 'not-a-url' })
    ).toThrow();
  });
});

describe('fetchMb1BoostCapability', () => {
  it('calls GET and parses body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schema: 'mb1',
        message_char_limit: 1200,
        terms_of_service_url: 'https://example.com/tos',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMb1BoostCapability('https://api.example.com/v1/s/mb1/boost/abc/');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1/s/mb1/boost/abc/', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
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
      fetchMb1BoostCapability('https://api.example.com/v1/s/mb1/boost/missing/')
    ).rejects.toThrow('404');

    vi.unstubAllGlobals();
  });
});

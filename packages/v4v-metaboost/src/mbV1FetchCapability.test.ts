import { describe, expect, it, vi } from 'vitest';

import {
  fetchMbV1BoostCapability,
  parseMbV1BoostCapabilityResponse,
} from './mbV1FetchCapability.js';

const validPayload = {
  schema: 'mb-v1',
  message_char_limit: 500,
  terms_of_service_url: 'https://example.com/terms',
};

describe('parseMbV1BoostCapabilityResponse', () => {
  it('returns limits, terms, and default blocked fields for valid mb-v1 payload', () => {
    expect(parseMbV1BoostCapabilityResponse(validPayload)).toEqual({
      messageCharLimit: 500,
      termsOfServiceUrl: 'https://example.com/terms',
      senderBlocked: false,
      senderBlockMessage: null,
      preferredCurrency: null,
      minimumMessageAmountMinor: null,
      conversionEndpointUrl: null,
    });
  });

  it('parses sender_blocked and sender_block_message when present', () => {
    expect(
      parseMbV1BoostCapabilityResponse({
        ...validPayload,
        sender_blocked: true,
        sender_block_message: '  Blocked by recipient  ',
      })
    ).toEqual({
      messageCharLimit: 500,
      termsOfServiceUrl: 'https://example.com/terms',
      senderBlocked: true,
      senderBlockMessage: 'Blocked by recipient',
      preferredCurrency: null,
      minimumMessageAmountMinor: null,
      conversionEndpointUrl: null,
    });
  });

  it('parses threshold context fields when present', () => {
    expect(
      parseMbV1BoostCapabilityResponse({
        ...validPayload,
        preferred_currency: 'USD',
        minimum_message_amount_minor: 100,
        conversion_endpoint_url:
          'https://example.com/v1/standard/mbrss-v1/messages/public/bucket/conversion',
      })
    ).toEqual({
      messageCharLimit: 500,
      termsOfServiceUrl: 'https://example.com/terms',
      senderBlocked: false,
      senderBlockMessage: null,
      preferredCurrency: 'USD',
      minimumMessageAmountMinor: 100,
      conversionEndpointUrl:
        'https://example.com/v1/standard/mbrss-v1/messages/public/bucket/conversion',
    });
  });

  it('rejects wrong schema', () => {
    expect(() =>
      parseMbV1BoostCapabilityResponse({
        ...validPayload,
        schema: 'other',
      })
    ).toThrow('mb-v1');
  });

  it('rejects invalid limit', () => {
    expect(() =>
      parseMbV1BoostCapabilityResponse({ ...validPayload, message_char_limit: NaN })
    ).toThrow();
    expect(() =>
      parseMbV1BoostCapabilityResponse({ ...validPayload, message_char_limit: -1 })
    ).toThrow();
  });

  it('rejects invalid terms URL', () => {
    expect(() =>
      parseMbV1BoostCapabilityResponse({ ...validPayload, terms_of_service_url: '' })
    ).toThrow();
    expect(() =>
      parseMbV1BoostCapabilityResponse({
        ...validPayload,
        terms_of_service_url: 'not-a-url',
      })
    ).toThrow();
  });
});

describe('fetchMbV1BoostCapability', () => {
  it('calls GET and parses body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schema: 'mb-v1',
        message_char_limit: 1200,
        terms_of_service_url: 'https://example.com/tos',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMbV1BoostCapability('https://api.example.com/v1/s/mb-v1/boost/abc/');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1/standard/mb-v1/boost/abc/', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(result).toEqual({
      messageCharLimit: 1200,
      termsOfServiceUrl: 'https://example.com/tos',
      senderBlocked: false,
      senderBlockMessage: null,
      preferredCurrency: null,
      minimumMessageAmountMinor: null,
      conversionEndpointUrl: null,
    });

    vi.unstubAllGlobals();
  });

  it('appends sender_guid query when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schema: 'mb-v1',
        message_char_limit: 100,
        terms_of_service_url: 'https://example.com/tos',
        sender_blocked: false,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchMbV1BoostCapability('https://api.example.com/v1/standard/mb-v1/boost/abc/', {
      senderGuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/standard/mb-v1/boost/abc/?sender_guid=550e8400-e29b-41d4-a716-446655440000',
      expect.any(Object)
    );

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
      fetchMbV1BoostCapability('https://api.example.com/v1/s/mb-v1/boost/missing/')
    ).rejects.toThrow('404');

    vi.unstubAllGlobals();
  });
});

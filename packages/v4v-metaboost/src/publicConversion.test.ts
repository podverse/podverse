import { describe, expect, it, vi } from 'vitest';

import { convertPublicBucketAmount } from './publicConversion.js';

describe('convertPublicBucketAmount', () => {
  it('returns deterministic error when amount_unit is missing', async () => {
    const result = await convertPublicBucketAmount({
      sourceCurrency: 'BTC',
      sourceAmountMinor: 1000,
      amountUnit: null,
      conversionEndpointUrl:
        'https://example.com/v1/standard/mbrss-v1/messages/public/a/conversion',
    });

    expect(result).toEqual({
      ok: false,
      code: 'missing_amount_unit',
      message: 'amount_unit is required.',
      status: null,
    });
  });

  it('skips conversion network call when source and target currencies match', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await convertPublicBucketAmount({
      sourceCurrency: 'btc',
      sourceAmountMinor: 25_000,
      amountUnit: 'satoshi',
      conversionEndpointUrl: 'https://example.com/v1/standard/mb-v1/messages/public/a/conversion',
      targetCurrency: 'BTC',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      didSkipNetwork: true,
      source: {
        currency: 'BTC',
        amountMinor: 25_000,
        amountUnit: 'satoshi',
      },
      target: {
        currency: 'BTC',
        amountMinor: 25_000,
        amountUnit: 'satoshi',
      },
      metadata: {
        exchangeRatesFetchedAt: null,
        fiatBaseCurrency: null,
        serverStandardCurrency: null,
      },
    });

    vi.unstubAllGlobals();
  });

  it('returns normalized conversion payload for cross-currency requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        source: {
          currency: 'BTC',
          amountMinor: 1000,
          amountUnit: 'satoshi',
        },
        target: {
          currency: 'USD',
          amountMinor: 62,
          amountUnit: 'cent',
        },
        metadata: {
          exchangeRatesFetchedAt: '2026-04-18T12:00:00.000Z',
          fiatBaseCurrency: 'USD',
          serverStandardCurrency: 'BTC',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await convertPublicBucketAmount({
      sourceCurrency: 'btc',
      sourceAmountMinor: 1000,
      amountUnit: 'satoshi',
      conversionEndpointUrl:
        'https://example.com/v1/standard/mbrss-v1/messages/public/a/conversion',
      targetCurrency: 'USD',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/v1/standard/mbrss-v1/messages/public/a/conversion?source_currency=BTC&source_amount=1000&amount_unit=satoshi',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );
    expect(result).toEqual({
      ok: true,
      didSkipNetwork: false,
      source: {
        currency: 'BTC',
        amountMinor: 1000,
        amountUnit: 'satoshi',
      },
      target: {
        currency: 'USD',
        amountMinor: 62,
        amountUnit: 'cent',
      },
      metadata: {
        exchangeRatesFetchedAt: '2026-04-18T12:00:00.000Z',
        fiatBaseCurrency: 'USD',
        serverStandardCurrency: 'BTC',
      },
    });

    vi.unstubAllGlobals();
  });

  it('returns deterministic invalid_amount_unit result on 400 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 400,
        json: async () => ({
          message: 'amount_unit must be satoshi for BTC',
        }),
      })
    );

    const result = await convertPublicBucketAmount({
      sourceCurrency: 'BTC',
      sourceAmountMinor: 1000,
      amountUnit: 'bitcoin',
      conversionEndpointUrl:
        'https://example.com/v1/standard/mbrss-v1/messages/public/a/conversion',
    });

    expect(result).toEqual({
      ok: false,
      code: 'invalid_amount_unit',
      message: 'amount_unit must be satoshi for BTC',
      status: 400,
    });

    vi.unstubAllGlobals();
  });
});

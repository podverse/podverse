import { describe, expect, it, vi } from 'vitest';

import { fetchPublicBucketConversionSnapshot } from './publicConversionSnapshot.js';

describe('fetchPublicBucketConversionSnapshot', () => {
  it('returns deterministic error when amount_unit is missing', async () => {
    const result = await fetchPublicBucketConversionSnapshot({
      sourceCurrency: 'BTC',
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

  it('returns parsed snapshot payload for successful request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        source: {
          currency: 'BTC',
          amountUnit: 'satoshis',
          minorUnitExponent: 8,
        },
        target: {
          currency: 'USD',
          amountUnit: 'cents',
          minorUnitExponent: 2,
        },
        ratio: {
          sourceMajorToTargetMajor: '100000',
          targetMajorToSourceMajor: '0.00001',
          roundingMode: 'half_up',
        },
        metadata: {
          exchangeRatesFetchedAt: '2026-04-20T12:00:00.000Z',
          fiatBaseCurrency: 'USD',
          serverStandardCurrency: 'BTC',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchPublicBucketConversionSnapshot({
      sourceCurrency: 'btc',
      amountUnit: 'satoshis',
      conversionEndpointUrl:
        'https://example.com/v1/standard/mbrss-v1/messages/public/a/conversion',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/v1/standard/mbrss-v1/messages/public/a/conversion?source_currency=BTC&amount_unit=satoshis',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );
    expect(result).toEqual({
      ok: true,
      source: {
        currency: 'BTC',
        amountUnit: 'satoshis',
        minorUnitExponent: 8,
      },
      target: {
        currency: 'USD',
        amountUnit: 'cents',
        minorUnitExponent: 2,
      },
      ratio: {
        sourceMajorToTargetMajor: 100000,
        targetMajorToSourceMajor: 0.00001,
        roundingMode: 'half_up',
      },
      metadata: {
        exchangeRatesFetchedAt: '2026-04-20T12:00:00.000Z',
        fiatBaseCurrency: 'USD',
        serverStandardCurrency: 'BTC',
      },
    });

    vi.unstubAllGlobals();
  });
});

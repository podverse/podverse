import { describe, expect, it } from 'vitest';

import {
  formatMinorAmountDisplay,
  getBoostCurrencyInputFormatMetadata,
  getBoostCurrencyInputSpec,
  parseMajorUnitToMinorAmount,
} from './boostCurrencyInput.js';

describe('getBoostCurrencyInputSpec', () => {
  it('returns denomination spec for representative currencies', () => {
    expect(getBoostCurrencyInputSpec('USD')).toEqual({
      currency: 'USD',
      canonicalAmountUnit: 'cents',
      minorUnitExponent: 2,
    });
    expect(getBoostCurrencyInputSpec('BTC')).toEqual({
      currency: 'BTC',
      canonicalAmountUnit: 'satoshis',
      minorUnitExponent: 0,
    });
    expect(getBoostCurrencyInputSpec('JPY')).toEqual({
      currency: 'JPY',
      canonicalAmountUnit: 'yen',
      minorUnitExponent: 0,
    });
    expect(getBoostCurrencyInputSpec('CHF')).toEqual({
      currency: 'CHF',
      canonicalAmountUnit: 'rappen',
      minorUnitExponent: 2,
    });
  });
});

describe('getBoostCurrencyInputFormatMetadata', () => {
  it('returns expected precision + symbol metadata', () => {
    expect(getBoostCurrencyInputFormatMetadata('USD', 'en-US')).toEqual({
      currency: 'USD',
      minorUnitExponent: 2,
      canonicalAmountUnit: 'cents',
      inputStep: '0.01',
      symbolPrefix: '$',
    });
    expect(getBoostCurrencyInputFormatMetadata('BTC', 'en-US')).toEqual({
      currency: 'BTC',
      minorUnitExponent: 0,
      canonicalAmountUnit: 'satoshis',
      inputStep: '1',
      symbolPrefix: null,
    });
    expect(getBoostCurrencyInputFormatMetadata('KRW', 'ko-KR')).toEqual({
      currency: 'KRW',
      minorUnitExponent: 0,
      canonicalAmountUnit: 'won',
      inputStep: '1',
      symbolPrefix: '₩',
    });
    expect(getBoostCurrencyInputFormatMetadata('EUR', 'de-DE')).toEqual({
      currency: 'EUR',
      minorUnitExponent: 2,
      canonicalAmountUnit: 'cents',
      inputStep: '0.01',
      symbolPrefix: '€',
    });
  });
});

describe('parseMajorUnitToMinorAmount', () => {
  it('converts valid major-unit strings to deterministic minor units', () => {
    expect(parseMajorUnitToMinorAmount('12.34', 'USD')).toEqual({
      ok: true,
      minorAmount: 1234,
    });
    expect(parseMajorUnitToMinorAmount('100', 'JPY')).toEqual({
      ok: true,
      minorAmount: 100,
    });
    expect(parseMajorUnitToMinorAmount('1000', 'BTC')).toEqual({
      ok: true,
      minorAmount: 1000,
    });
  });

  it('rejects over-precision and decimal input for zero-decimal currencies', () => {
    expect(parseMajorUnitToMinorAmount('1.234', 'USD')).toEqual({
      ok: false,
      code: 'too_many_decimals',
      message: 'Amount has more than 2 decimal places for USD.',
    });
    expect(parseMajorUnitToMinorAmount('10.5', 'JPY')).toEqual({
      ok: false,
      code: 'too_many_decimals',
      message: 'Amount has more than 0 decimal places for JPY.',
    });
    expect(parseMajorUnitToMinorAmount('12.2', 'BTC')).toEqual({
      ok: false,
      code: 'too_many_decimals',
      message: 'Amount has more than 0 decimal places for BTC.',
    });
  });

  it('rejects non-numeric amount input without implicit unit guessing', () => {
    expect(parseMajorUnitToMinorAmount('abc', 'USD')).toEqual({
      ok: false,
      code: 'invalid_number',
      message: 'Amount must be a valid number.',
    });
  });
});

describe('formatMinorAmountDisplay', () => {
  const resolveAmountUnitLabel = ({
    canonicalAmountUnit,
    amountMinor,
  }: {
    canonicalAmountUnit: string;
    amountMinor: number;
  }) => {
    if (canonicalAmountUnit === 'satoshis') {
      return amountMinor === 1 ? 'sat' : 'sats';
    }
    return canonicalAmountUnit;
  };

  it('formats fiat amounts as localized major-unit currency values', () => {
    expect(
      formatMinorAmountDisplay({
        amountMinor: 150,
        currency: 'USD',
        locale: 'en-US',
        resolveAmountUnitLabel,
      })
    ).toBe('$1.50');
    expect(
      formatMinorAmountDisplay({
        amountMinor: 8,
        currency: 'USD',
        locale: 'fr-FR',
        resolveAmountUnitLabel,
      })
    ).toBe(
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
      }).format(0.08)
    );
    expect(
      formatMinorAmountDisplay({
        amountMinor: 150,
        currency: 'EUR',
        locale: 'de-DE',
        resolveAmountUnitLabel,
      })
    ).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(1.5)
    );
    expect(
      formatMinorAmountDisplay({
        amountMinor: 150,
        currency: 'JPY',
        locale: 'ja-JP',
        resolveAmountUnitLabel,
      })
    ).toBe(
      new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
      }).format(150)
    );
    expect(
      formatMinorAmountDisplay({
        amountMinor: 150,
        currency: 'KRW',
        locale: 'ko-KR',
        resolveAmountUnitLabel,
      })
    ).toBe(
      new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
      }).format(150)
    );
  });

  it('formats BTC amounts in satoshis', () => {
    expect(
      formatMinorAmountDisplay({
        amountMinor: 150,
        currency: 'BTC',
        locale: 'en-US',
        resolveAmountUnitLabel,
      })
    ).toBe('150 sats');
  });

  it('falls back cleanly for unsupported currencies', () => {
    expect(
      formatMinorAmountDisplay({
        amountMinor: 10,
        currency: 'XXX',
        locale: 'en-US',
        resolveAmountUnitLabel,
      })
    ).toBeNull();
  });
});

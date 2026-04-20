import { describe, expect, it } from 'vitest';

import {
  getBoostCurrencyInputFormatMetadata,
  getBoostCurrencyInputSpec,
  parseMajorUnitToMinorAmount,
} from './boostCurrencyInput.js';

describe('getBoostCurrencyInputSpec', () => {
  it('returns denomination spec for representative currencies', () => {
    expect(getBoostCurrencyInputSpec('USD')).toEqual({
      currency: 'USD',
      canonicalAmountUnit: 'cent',
      minorUnitExponent: 2,
    });
    expect(getBoostCurrencyInputSpec('BTC')).toEqual({
      currency: 'BTC',
      canonicalAmountUnit: 'satoshi',
      minorUnitExponent: 0,
    });
    expect(getBoostCurrencyInputSpec('JPY')).toEqual({
      currency: 'JPY',
      canonicalAmountUnit: 'yen',
      minorUnitExponent: 0,
    });
  });
});

describe('getBoostCurrencyInputFormatMetadata', () => {
  it('returns expected precision + symbol metadata', () => {
    expect(getBoostCurrencyInputFormatMetadata('USD', 'en-US')).toEqual({
      currency: 'USD',
      minorUnitExponent: 2,
      canonicalAmountUnit: 'cent',
      inputStep: '0.01',
      symbolPrefix: '$',
    });
    expect(getBoostCurrencyInputFormatMetadata('BTC', 'en-US')).toEqual({
      currency: 'BTC',
      minorUnitExponent: 0,
      canonicalAmountUnit: 'satoshi',
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
      canonicalAmountUnit: 'cent',
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
      message: 'Amount must be a valid non-negative number.',
    });
  });
});

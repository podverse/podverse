const BOOST_INPUT_CURRENCY_SPECS = {
  BTC: {
    canonicalAmountUnit: 'satoshis',
    singularAmountUnitFallback: 'satoshi',
    minorUnitExponent: 0,
  },
  USD: {
    canonicalAmountUnit: 'cents',
    singularAmountUnitFallback: 'cent',
    minorUnitExponent: 2,
  },
  EUR: {
    canonicalAmountUnit: 'cents',
    singularAmountUnitFallback: 'cent',
    minorUnitExponent: 2,
  },
  GBP: {
    canonicalAmountUnit: 'pence',
    singularAmountUnitFallback: 'pence',
    minorUnitExponent: 2,
  },
  JPY: {
    canonicalAmountUnit: 'yen',
    singularAmountUnitFallback: 'yen',
    minorUnitExponent: 0,
  },
  KRW: {
    canonicalAmountUnit: 'won',
    singularAmountUnitFallback: 'won',
    minorUnitExponent: 0,
  },
} as const;

const FALLBACK_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  KRW: '₩',
};

const MAJOR_UNIT_INPUT_REGEX = /^-?\d+(\.\d+)?$/;
const PLURAL_TO_SINGULAR_AMOUNT_UNIT_FALLBACKS: Record<string, string> = {
  satoshis: 'satoshi',
  cents: 'cent',
  pence: 'pence',
  yen: 'yen',
  won: 'won',
};

type SupportedBoostInputCurrency = keyof typeof BOOST_INPUT_CURRENCY_SPECS;

export type BoostCurrencyInputSpec = {
  currency: SupportedBoostInputCurrency;
  canonicalAmountUnit: (typeof BOOST_INPUT_CURRENCY_SPECS)[SupportedBoostInputCurrency]['canonicalAmountUnit'];
  singularAmountUnitFallback: (typeof BOOST_INPUT_CURRENCY_SPECS)[SupportedBoostInputCurrency]['singularAmountUnitFallback'];
  minorUnitExponent: (typeof BOOST_INPUT_CURRENCY_SPECS)[SupportedBoostInputCurrency]['minorUnitExponent'];
};

export type BoostCurrencyInputFormatMetadata = {
  currency: SupportedBoostInputCurrency;
  minorUnitExponent: number;
  canonicalAmountUnit: string;
  singularAmountUnitFallback: string;
  inputStep: string;
  symbolPrefix: string | null;
};

export type ParseMajorUnitToMinorResult =
  | {
      ok: true;
      minorAmount: number;
    }
  | {
      ok: false;
      code: 'invalid_number' | 'too_many_decimals' | 'not_supported';
      message: string;
    };

const normalizeCurrencyCode = (currency: string): SupportedBoostInputCurrency | null => {
  const normalized = currency.trim().toUpperCase();
  if (Object.hasOwn(BOOST_INPUT_CURRENCY_SPECS, normalized)) {
    return normalized as SupportedBoostInputCurrency;
  }
  return null;
};

const resolveSymbolPrefix = (
  currency: SupportedBoostInputCurrency,
  locale: string | undefined
): string | null => {
  if (currency === 'BTC') {
    return null;
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const part = formatter.formatToParts(1).find((value) => value.type === 'currency');
    if (part !== undefined && part.value.trim() !== '') {
      return part.value;
    }
  } catch {
    // Fallback map handles unsupported runtime formatting cases.
  }

  return FALLBACK_CURRENCY_SYMBOLS[currency] ?? null;
};

export const getBoostCurrencyInputSpec = (currency: string): BoostCurrencyInputSpec | null => {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  if (normalizedCurrency === null) {
    return null;
  }

  const spec = BOOST_INPUT_CURRENCY_SPECS[normalizedCurrency];
  return {
    currency: normalizedCurrency,
    canonicalAmountUnit: spec.canonicalAmountUnit,
    singularAmountUnitFallback: spec.singularAmountUnitFallback,
    minorUnitExponent: spec.minorUnitExponent,
  };
};

export const getBoostCurrencyInputFormatMetadata = (
  currency: string,
  locale?: string
): BoostCurrencyInputFormatMetadata | null => {
  const spec = getBoostCurrencyInputSpec(currency);
  if (spec === null) {
    return null;
  }

  const inputStep =
    spec.minorUnitExponent === 0 ? '1' : `0.${'0'.repeat(spec.minorUnitExponent - 1)}1`;

  return {
    currency: spec.currency,
    minorUnitExponent: spec.minorUnitExponent,
    canonicalAmountUnit: spec.canonicalAmountUnit,
    singularAmountUnitFallback: spec.singularAmountUnitFallback,
    inputStep,
    symbolPrefix: resolveSymbolPrefix(spec.currency, locale),
  };
};

export const toSingularAmountUnitFallback = (amountUnit: string): string => {
  const normalizedUnit = amountUnit.trim().toLowerCase();
  return PLURAL_TO_SINGULAR_AMOUNT_UNIT_FALLBACKS[normalizedUnit] ?? normalizedUnit;
};

export const parseMajorUnitToMinorAmount = (
  amountText: string,
  currency: string
): ParseMajorUnitToMinorResult => {
  const spec = getBoostCurrencyInputSpec(currency);
  if (spec === null) {
    return {
      ok: false,
      code: 'not_supported',
      message: `Unsupported currency: ${currency}`,
    };
  }

  const normalizedText = amountText.trim();
  if (!MAJOR_UNIT_INPUT_REGEX.test(normalizedText)) {
    return {
      ok: false,
      code: 'invalid_number',
      message: 'Amount must be a valid number.',
    };
  }

  const [integerPart, decimalsPart = ''] = normalizedText.split('.');
  if (decimalsPart.length > spec.minorUnitExponent) {
    return {
      ok: false,
      code: 'too_many_decimals',
      message: `Amount has more than ${spec.minorUnitExponent} decimal places for ${spec.currency}.`,
    };
  }

  const paddedDecimals = decimalsPart.padEnd(spec.minorUnitExponent, '0');
  const minorAmountText = `${integerPart}${paddedDecimals}`;
  const minorAmount = Number(minorAmountText);
  if (!Number.isSafeInteger(minorAmount)) {
    return {
      ok: false,
      code: 'invalid_number',
      message: 'Amount is outside supported range.',
    };
  }

  return {
    ok: true,
    minorAmount,
  };
};

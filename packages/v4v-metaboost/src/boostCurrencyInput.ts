const BOOST_INPUT_CURRENCY_SPECS = {
  BTC: {
    canonicalAmountUnit: 'satoshis',
    minorUnitExponent: 0,
  },
  USD: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  EUR: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  GBP: {
    canonicalAmountUnit: 'pence',
    minorUnitExponent: 2,
  },
  JPY: {
    canonicalAmountUnit: 'yen',
    minorUnitExponent: 0,
  },
  KRW: {
    canonicalAmountUnit: 'won',
    minorUnitExponent: 0,
  },
  CAD: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  AUD: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  CHF: {
    canonicalAmountUnit: 'rappen',
    minorUnitExponent: 2,
  },
  NZD: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  SEK: {
    canonicalAmountUnit: 'ore',
    minorUnitExponent: 2,
  },
  NOK: {
    canonicalAmountUnit: 'ore',
    minorUnitExponent: 2,
  },
  DKK: {
    canonicalAmountUnit: 'ore',
    minorUnitExponent: 2,
  },
  INR: {
    canonicalAmountUnit: 'paise',
    minorUnitExponent: 2,
  },
  BRL: {
    canonicalAmountUnit: 'centavos',
    minorUnitExponent: 2,
  },
  MXN: {
    canonicalAmountUnit: 'centavos',
    minorUnitExponent: 2,
  },
  ZAR: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  SGD: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
  HKD: {
    canonicalAmountUnit: 'cents',
    minorUnitExponent: 2,
  },
} as const;

const MAJOR_UNIT_INPUT_REGEX = /^-?\d+(\.\d+)?$/;

type SupportedBoostInputCurrency = keyof typeof BOOST_INPUT_CURRENCY_SPECS;

export type BoostCurrencyInputSpec = {
  currency: SupportedBoostInputCurrency;
  canonicalAmountUnit: (typeof BOOST_INPUT_CURRENCY_SPECS)[SupportedBoostInputCurrency]['canonicalAmountUnit'];
  minorUnitExponent: (typeof BOOST_INPUT_CURRENCY_SPECS)[SupportedBoostInputCurrency]['minorUnitExponent'];
};

export type BoostCurrencyInputFormatMetadata = {
  currency: SupportedBoostInputCurrency;
  minorUnitExponent: number;
  canonicalAmountUnit: string;
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

export type FormatMinorAmountDisplayParams = {
  amountMinor: number;
  currency: string;
  locale?: string;
  resolveAmountUnitLabel: (input: {
    canonicalAmountUnit: string;
    currency: SupportedBoostInputCurrency;
    amountMinor: number;
  }) => string;
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
    return null;
  }

  return null;
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
    inputStep,
    symbolPrefix: resolveSymbolPrefix(spec.currency, locale),
  };
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

export const formatMinorAmountDisplay = ({
  amountMinor,
  currency,
  locale,
  resolveAmountUnitLabel,
}: FormatMinorAmountDisplayParams): string | null => {
  const spec = getBoostCurrencyInputSpec(currency);
  if (spec === null) {
    return null;
  }

  const normalizedAmountMinor = Math.max(0, Math.round(amountMinor));
  if (spec.currency !== 'BTC') {
    const amountMajor = normalizedAmountMinor / 10 ** spec.minorUnitExponent;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: spec.currency,
      }).format(amountMajor);
    } catch {
      return null;
    }
  }

  const formattedAmountMinor = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(normalizedAmountMinor);
  const formattedUnit = resolveAmountUnitLabel({
    canonicalAmountUnit: spec.canonicalAmountUnit,
    currency: spec.currency,
    amountMinor: normalizedAmountMinor,
  }).trim();

  return formattedUnit === '' ? formattedAmountMinor : `${formattedAmountMinor} ${formattedUnit}`;
};

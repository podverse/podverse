import {
  getOwnPropertyValue,
  isObjectLike,
  normalizeUpperCaseToken,
  parseFiniteNumber,
  parseNonEmptyString,
} from '@podverse/helpers';
import { parseHttpOrHttpsUrl } from '@podverse/helpers-validation';

import { toSingularAmountUnitFallback } from './boostCurrencyInput.js';

export type PublicBucketConversionSuccess = {
  ok: true;
  didSkipNetwork: boolean;
  source: {
    currency: string;
    amountMinor: number;
    amountUnit: string;
  };
  target: {
    currency: string;
    amountMinor: number;
    amountUnit: string;
  };
  metadata: {
    exchangeRatesFetchedAt: string | null;
    fiatBaseCurrency: string | null;
    serverStandardCurrency: string | null;
  };
};

export type PublicBucketConversionErrorCode =
  | 'missing_amount_unit'
  | 'invalid_input'
  | 'invalid_amount_unit'
  | 'request_failed'
  | 'invalid_response';

export type PublicBucketConversionError = {
  ok: false;
  code: PublicBucketConversionErrorCode;
  message: string;
  status: number | null;
};

export type PublicBucketConversionResult =
  | PublicBucketConversionSuccess
  | PublicBucketConversionError;

export type ConvertPublicBucketAmountParams = {
  sourceCurrency: string;
  sourceAmountMinor: number;
  amountUnit: string | null | undefined;
  conversionEndpointUrl: string;
  targetCurrency?: string | null;
};

const normalizeUrl = (urlRaw: string): string | null => {
  const parsed = parseHttpOrHttpsUrl(urlRaw);
  return parsed ? parsed.toString() : null;
};

const parseResponsePayload = (
  data: unknown
): PublicBucketConversionSuccess | PublicBucketConversionError => {
  if (!isObjectLike(data)) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Conversion response must be an object.',
      status: null,
    };
  }

  const source = getOwnPropertyValue(data, 'source');
  const target = getOwnPropertyValue(data, 'target');
  const metadata = getOwnPropertyValue(data, 'metadata');
  if (!isObjectLike(source) || !isObjectLike(target) || !isObjectLike(metadata)) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Conversion response is missing source/target/metadata objects.',
      status: null,
    };
  }

  const sourceCurrency = parseNonEmptyString(getOwnPropertyValue(source, 'currency'));
  const sourceAmountMinor = parseFiniteNumber(getOwnPropertyValue(source, 'amountMinor'));
  const sourceAmountUnit = parseNonEmptyString(getOwnPropertyValue(source, 'amountUnit'));
  const targetCurrency = parseNonEmptyString(getOwnPropertyValue(target, 'currency'));
  const targetAmountMinor = parseFiniteNumber(getOwnPropertyValue(target, 'amountMinor'));
  const targetAmountUnit = parseNonEmptyString(getOwnPropertyValue(target, 'amountUnit'));

  if (
    sourceCurrency === null ||
    sourceAmountMinor === null ||
    sourceAmountUnit === null ||
    targetCurrency === null ||
    targetAmountMinor === null ||
    targetAmountUnit === null
  ) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Conversion response has invalid source/target fields.',
      status: null,
    };
  }

  const fetchedAtRaw = getOwnPropertyValue(metadata, 'exchangeRatesFetchedAt');
  const fiatBaseRaw = getOwnPropertyValue(metadata, 'fiatBaseCurrency');
  const serverStandardRaw = getOwnPropertyValue(metadata, 'serverStandardCurrency');

  return {
    ok: true,
    didSkipNetwork: false,
    source: {
      currency: sourceCurrency,
      amountMinor: sourceAmountMinor,
      amountUnit: sourceAmountUnit,
    },
    target: {
      currency: targetCurrency,
      amountMinor: targetAmountMinor,
      amountUnit: targetAmountUnit,
    },
    metadata: {
      exchangeRatesFetchedAt: typeof fetchedAtRaw === 'string' ? fetchedAtRaw : null,
      fiatBaseCurrency: typeof fiatBaseRaw === 'string' ? fiatBaseRaw : null,
      serverStandardCurrency: typeof serverStandardRaw === 'string' ? serverStandardRaw : null,
    },
  };
};

const parseErrorPayloadMessage = (payload: unknown): string | null => {
  if (!isObjectLike(payload)) {
    return null;
  }
  const directMessage = getOwnPropertyValue(payload, 'message');
  if (typeof directMessage === 'string' && directMessage.trim() !== '') {
    return directMessage.trim();
  }
  return null;
};

const toRequestErrorCode = (status: number): PublicBucketConversionErrorCode => {
  if (status === 400) {
    return 'invalid_amount_unit';
  }
  return 'request_failed';
};

export const convertPublicBucketAmount = async (
  params: ConvertPublicBucketAmountParams
): Promise<PublicBucketConversionResult> => {
  const sourceCurrency = parseNonEmptyString(params.sourceCurrency);
  if (sourceCurrency === null) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'sourceCurrency is required.',
      status: null,
    };
  }
  if (!Number.isInteger(params.sourceAmountMinor) || params.sourceAmountMinor < 0) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'sourceAmountMinor must be a non-negative integer.',
      status: null,
    };
  }

  const amountUnit = parseNonEmptyString(params.amountUnit);
  if (amountUnit === null) {
    return {
      ok: false,
      code: 'missing_amount_unit',
      message: 'amount_unit is required.',
      status: null,
    };
  }

  const conversionEndpointUrl = normalizeUrl(params.conversionEndpointUrl);
  if (conversionEndpointUrl === null) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'conversionEndpointUrl must be an HTTP(S) URL.',
      status: null,
    };
  }

  const normalizedSourceCurrency = normalizeUpperCaseToken(sourceCurrency);
  const normalizedTargetCurrency =
    params.targetCurrency === null || params.targetCurrency === undefined
      ? null
      : normalizeUpperCaseToken(params.targetCurrency);

  if (normalizedTargetCurrency !== null && normalizedTargetCurrency === normalizedSourceCurrency) {
    return {
      ok: true,
      didSkipNetwork: true,
      source: {
        currency: normalizedSourceCurrency,
        amountMinor: params.sourceAmountMinor,
        amountUnit,
      },
      target: {
        currency: normalizedTargetCurrency,
        amountMinor: params.sourceAmountMinor,
        amountUnit,
      },
      metadata: {
        exchangeRatesFetchedAt: null,
        fiatBaseCurrency: null,
        serverStandardCurrency: null,
      },
    };
  }

  const singularFallbackAmountUnit = toSingularAmountUnitFallback(amountUnit);
  const amountUnitAttempts =
    singularFallbackAmountUnit !== amountUnit
      ? [amountUnit, singularFallbackAmountUnit]
      : [amountUnit];

  for (const [attemptIndex, requestedAmountUnit] of amountUnitAttempts.entries()) {
    const requestUrl = new URL(conversionEndpointUrl);
    requestUrl.searchParams.set('source_currency', normalizedSourceCurrency);
    requestUrl.searchParams.set('source_amount', String(params.sourceAmountMinor));
    requestUrl.searchParams.set('amount_unit', requestedAmountUnit);

    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status < 200 || response.status >= 300) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        // Non-JSON error payloads are handled by generic fallback message.
      }

      const message =
        parseErrorPayloadMessage(payload) ??
        `Conversion request failed with status ${response.status}.`;
      const shouldRetryWithSingularFallback =
        response.status === 400 &&
        attemptIndex === 0 &&
        amountUnitAttempts.length > 1 &&
        message.toLowerCase().includes('amount_unit');
      if (shouldRetryWithSingularFallback) {
        continue;
      }

      return {
        ok: false,
        code: toRequestErrorCode(response.status),
        message,
        status: response.status,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        code: 'invalid_response',
        message: 'Conversion response is not valid JSON.',
        status: response.status,
      };
    }

    const parsed = parseResponsePayload(data);
    if (!parsed.ok) {
      return {
        ...parsed,
        status: response.status,
      };
    }
    return parsed;
  }

  return {
    ok: false,
    code: 'request_failed',
    message: 'Conversion request failed before a response could be parsed.',
    status: null,
  };
};

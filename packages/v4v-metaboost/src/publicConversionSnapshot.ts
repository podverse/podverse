import {
  getOwnPropertyValue,
  isObjectLike,
  normalizeUpperCaseToken,
  parseNonEmptyString,
} from '@podverse/helpers';
import { parseHttpOrHttpsUrl } from '@podverse/helpers-validation';

import { toSingularAmountUnitFallback } from './boostCurrencyInput.js';

export type PublicBucketConversionSnapshotSuccess = {
  ok: true;
  source: {
    currency: string;
    amountUnit: string;
    minorUnitExponent: number;
  };
  target: {
    currency: string;
    amountUnit: string;
    minorUnitExponent: number;
  };
  ratio: {
    sourceMajorToTargetMajor: number;
    targetMajorToSourceMajor: number;
    roundingMode: 'half_up';
  };
  metadata: {
    exchangeRatesFetchedAt: string | null;
    fiatBaseCurrency: string | null;
    serverStandardCurrency: string | null;
  };
};

export type PublicBucketConversionSnapshotErrorCode =
  | 'missing_amount_unit'
  | 'invalid_input'
  | 'invalid_amount_unit'
  | 'request_failed'
  | 'invalid_response';

export type PublicBucketConversionSnapshotError = {
  ok: false;
  code: PublicBucketConversionSnapshotErrorCode;
  message: string;
  status: number | null;
};

export type PublicBucketConversionSnapshotResult =
  | PublicBucketConversionSnapshotSuccess
  | PublicBucketConversionSnapshotError;

export type FetchPublicBucketConversionSnapshotParams = {
  sourceCurrency: string;
  amountUnit: string | null | undefined;
  conversionSnapshotEndpointUrl: string;
};

const normalizeUrl = (urlRaw: string): string | null => {
  const parsed = parseHttpOrHttpsUrl(urlRaw);
  return parsed ? parsed.toString() : null;
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

const toRequestErrorCode = (status: number): PublicBucketConversionSnapshotErrorCode => {
  if (status === 400) {
    return 'invalid_amount_unit';
  }
  return 'request_failed';
};

const parseCurrencyContext = (
  payload: unknown,
  key: 'source' | 'target'
): {
  currency: string;
  amountUnit: string;
  minorUnitExponent: number;
} | null => {
  const contextRaw = getOwnPropertyValue(payload, key);
  if (!isObjectLike(contextRaw)) {
    return null;
  }
  const currency = parseNonEmptyString(getOwnPropertyValue(contextRaw, 'currency'));
  const amountUnit = parseNonEmptyString(getOwnPropertyValue(contextRaw, 'amountUnit'));
  const minorUnitExponentRaw = getOwnPropertyValue(contextRaw, 'minorUnitExponent');
  if (
    currency === null ||
    amountUnit === null ||
    typeof minorUnitExponentRaw !== 'number' ||
    !Number.isInteger(minorUnitExponentRaw) ||
    minorUnitExponentRaw < 0 ||
    minorUnitExponentRaw > 8
  ) {
    return null;
  }
  return {
    currency,
    amountUnit,
    minorUnitExponent: minorUnitExponentRaw,
  };
};

const parseResponsePayload = (
  data: unknown
): PublicBucketConversionSnapshotSuccess | PublicBucketConversionSnapshotError => {
  if (!isObjectLike(data)) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Conversion snapshot response must be an object.',
      status: null,
    };
  }

  const source = parseCurrencyContext(data, 'source');
  const target = parseCurrencyContext(data, 'target');
  const ratioRaw = getOwnPropertyValue(data, 'ratio');
  const metadataRaw = getOwnPropertyValue(data, 'metadata');
  if (!source || !target || !isObjectLike(ratioRaw) || !isObjectLike(metadataRaw)) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Conversion snapshot response is missing source/target/ratio/metadata objects.',
      status: null,
    };
  }

  const sourceMajorToTargetMajorRaw = getOwnPropertyValue(ratioRaw, 'sourceMajorToTargetMajor');
  const targetMajorToSourceMajorRaw = getOwnPropertyValue(ratioRaw, 'targetMajorToSourceMajor');
  const roundingModeRaw = getOwnPropertyValue(ratioRaw, 'roundingMode');
  const sourceMajorToTargetMajor =
    typeof sourceMajorToTargetMajorRaw === 'string'
      ? Number.parseFloat(sourceMajorToTargetMajorRaw)
      : Number.NaN;
  const targetMajorToSourceMajor =
    typeof targetMajorToSourceMajorRaw === 'string'
      ? Number.parseFloat(targetMajorToSourceMajorRaw)
      : Number.NaN;

  if (
    !Number.isFinite(sourceMajorToTargetMajor) ||
    sourceMajorToTargetMajor <= 0 ||
    !Number.isFinite(targetMajorToSourceMajor) ||
    targetMajorToSourceMajor <= 0 ||
    roundingModeRaw !== 'half_up'
  ) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Conversion snapshot response has invalid ratio fields.',
      status: null,
    };
  }

  const fetchedAtRaw = getOwnPropertyValue(metadataRaw, 'exchangeRatesFetchedAt');
  const fiatBaseRaw = getOwnPropertyValue(metadataRaw, 'fiatBaseCurrency');
  const serverStandardRaw = getOwnPropertyValue(metadataRaw, 'serverStandardCurrency');

  return {
    ok: true,
    source,
    target,
    ratio: {
      sourceMajorToTargetMajor,
      targetMajorToSourceMajor,
      roundingMode: 'half_up',
    },
    metadata: {
      exchangeRatesFetchedAt: typeof fetchedAtRaw === 'string' ? fetchedAtRaw : null,
      fiatBaseCurrency: typeof fiatBaseRaw === 'string' ? fiatBaseRaw : null,
      serverStandardCurrency: typeof serverStandardRaw === 'string' ? serverStandardRaw : null,
    },
  };
};

export const fetchPublicBucketConversionSnapshot = async (
  params: FetchPublicBucketConversionSnapshotParams
): Promise<PublicBucketConversionSnapshotResult> => {
  const sourceCurrency = parseNonEmptyString(params.sourceCurrency);
  if (sourceCurrency === null) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'sourceCurrency is required.',
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
  const conversionSnapshotEndpointUrl = normalizeUrl(params.conversionSnapshotEndpointUrl);
  if (conversionSnapshotEndpointUrl === null) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'conversionSnapshotEndpointUrl must be an HTTP(S) URL.',
      status: null,
    };
  }
  const normalizedSourceCurrency = normalizeUpperCaseToken(sourceCurrency);
  const singularFallbackAmountUnit = toSingularAmountUnitFallback(amountUnit);
  const amountUnitAttempts =
    singularFallbackAmountUnit !== amountUnit
      ? [amountUnit, singularFallbackAmountUnit]
      : [amountUnit];

  for (const [attemptIndex, requestedAmountUnit] of amountUnitAttempts.entries()) {
    const requestUrl = new URL(conversionSnapshotEndpointUrl);
    requestUrl.searchParams.set('source_currency', normalizedSourceCurrency);
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
        `Conversion snapshot request failed with status ${response.status}.`;
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
        message: 'Conversion snapshot response is not valid JSON.',
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
    message: 'Conversion snapshot request failed before a response could be parsed.',
    status: null,
  };
};

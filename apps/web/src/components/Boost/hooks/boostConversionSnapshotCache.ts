import {
  fetchPublicBucketConversionSnapshot,
  getBoostCurrencyInputSpec,
  type PublicBucketConversionSnapshotErrorCode,
} from '@podverse/v4v-metaboost';

type SnapshotCacheKey = string;

export type CachedConversionSnapshot = {
  sourceCurrency: string;
  sourceAmountUnit: string;
  sourceMinorUnitExponent: number;
  targetCurrency: string;
  targetAmountUnit: string;
  targetMinorUnitExponent: number;
  sourceMajorToTargetMajor: number;
  targetMajorToSourceMajor: number;
  exchangeRatesFetchedAt: string | null;
  fiatBaseCurrency: string | null;
  serverStandardCurrency: string | null;
};

type CachedConversionSnapshotResult =
  | { ok: true; snapshot: CachedConversionSnapshot }
  | {
      ok: false;
      code: PublicBucketConversionSnapshotErrorCode | 'missing_metadata';
      message: string;
      status: number | null;
    };

type ResolveCachedConversionSnapshotParams = {
  sourceCurrency: string;
  sourceAmountUnit: string;
  preferredCurrency: string;
  conversionEndpointUrl: string | null;
};

const snapshotCache = new Map<SnapshotCacheKey, CachedConversionSnapshot>();
const inflightSnapshotCache = new Map<SnapshotCacheKey, Promise<CachedConversionSnapshotResult>>();

const toCacheKey = (input: {
  endpointUrl: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmountUnit: string;
}): SnapshotCacheKey =>
  `${input.endpointUrl}|${input.sourceCurrency}|${input.targetCurrency}|${input.sourceAmountUnit}`;

export const convertMinorWithSnapshot = (
  snapshot: CachedConversionSnapshot,
  sourceAmountMinor: number
): number => {
  const sourceMinorDivisor = 10 ** snapshot.sourceMinorUnitExponent;
  const targetMinorMultiplier = 10 ** snapshot.targetMinorUnitExponent;
  const sourceMajor = sourceAmountMinor / sourceMinorDivisor;
  const targetMajor = sourceMajor * snapshot.sourceMajorToTargetMajor;
  return Math.max(0, Math.round(targetMajor * targetMinorMultiplier));
};

const buildIdentitySnapshot = (
  sourceCurrency: string,
  sourceAmountUnit: string
): CachedConversionSnapshotResult => {
  const sourceSpec = getBoostCurrencyInputSpec(sourceCurrency);
  if (sourceSpec === null) {
    return {
      ok: false,
      code: 'invalid_input',
      message: `Unsupported source currency "${sourceCurrency}".`,
      status: null,
    };
  }
  return {
    ok: true,
    snapshot: {
      sourceCurrency,
      sourceAmountUnit,
      sourceMinorUnitExponent: sourceSpec.minorUnitExponent,
      targetCurrency: sourceCurrency,
      targetAmountUnit: sourceAmountUnit,
      targetMinorUnitExponent: sourceSpec.minorUnitExponent,
      sourceMajorToTargetMajor: 1,
      targetMajorToSourceMajor: 1,
      exchangeRatesFetchedAt: null,
      fiatBaseCurrency: null,
      serverStandardCurrency: null,
    },
  };
};

export const resolveCachedConversionSnapshot = async ({
  sourceCurrency,
  sourceAmountUnit,
  preferredCurrency,
  conversionEndpointUrl,
}: ResolveCachedConversionSnapshotParams): Promise<CachedConversionSnapshotResult> => {
  const normalizedSourceCurrency = sourceCurrency.trim().toUpperCase();
  const normalizedPreferredCurrency = preferredCurrency.trim().toUpperCase();
  const normalizedSourceAmountUnit = sourceAmountUnit.trim();
  if (
    normalizedSourceCurrency === '' ||
    normalizedPreferredCurrency === '' ||
    normalizedSourceAmountUnit === ''
  ) {
    return {
      ok: false,
      code: 'missing_metadata',
      message: 'source_currency, preferred_currency, and amount_unit are required.',
      status: null,
    };
  }
  if (normalizedSourceCurrency === normalizedPreferredCurrency) {
    return buildIdentitySnapshot(normalizedSourceCurrency, normalizedSourceAmountUnit);
  }

  const resolvedConversionEndpointUrl = conversionEndpointUrl?.trim() ?? '';
  if (resolvedConversionEndpointUrl === '') {
    return {
      ok: false,
      code: 'missing_metadata',
      message: 'conversion_endpoint_url is required.',
      status: null,
    };
  }

  const key = toCacheKey({
    endpointUrl: resolvedConversionEndpointUrl,
    sourceCurrency: normalizedSourceCurrency,
    targetCurrency: normalizedPreferredCurrency,
    sourceAmountUnit: normalizedSourceAmountUnit,
  });
  const cached = snapshotCache.get(key);
  if (cached !== undefined) {
    return { ok: true, snapshot: cached };
  }

  const inflight = inflightSnapshotCache.get(key);
  if (inflight !== undefined) {
    return inflight;
  }

  const requestPromise = (async (): Promise<CachedConversionSnapshotResult> => {
    try {
      const snapshotResult = await fetchPublicBucketConversionSnapshot({
        sourceCurrency: normalizedSourceCurrency,
        amountUnit: normalizedSourceAmountUnit,
        conversionEndpointUrl: resolvedConversionEndpointUrl,
      });
      if (!snapshotResult.ok) {
        return snapshotResult;
      }
      if (snapshotResult.target.currency.trim().toUpperCase() !== normalizedPreferredCurrency) {
        return {
          ok: false,
          code: 'invalid_response',
          message: `Snapshot target currency ${snapshotResult.target.currency} does not match expected ${normalizedPreferredCurrency}.`,
          status: null,
        };
      }
      const snapshot: CachedConversionSnapshot = {
        sourceCurrency: snapshotResult.source.currency,
        sourceAmountUnit: snapshotResult.source.amountUnit,
        sourceMinorUnitExponent: snapshotResult.source.minorUnitExponent,
        targetCurrency: snapshotResult.target.currency,
        targetAmountUnit: snapshotResult.target.amountUnit,
        targetMinorUnitExponent: snapshotResult.target.minorUnitExponent,
        sourceMajorToTargetMajor: snapshotResult.ratio.sourceMajorToTargetMajor,
        targetMajorToSourceMajor: snapshotResult.ratio.targetMajorToSourceMajor,
        exchangeRatesFetchedAt: snapshotResult.metadata.exchangeRatesFetchedAt,
        fiatBaseCurrency: snapshotResult.metadata.fiatBaseCurrency,
        serverStandardCurrency: snapshotResult.metadata.serverStandardCurrency,
      };
      snapshotCache.set(key, snapshot);
      return { ok: true, snapshot };
    } catch (error) {
      return {
        ok: false,
        code: 'request_failed',
        message: error instanceof Error ? error.message : String(error),
        status: null,
      };
    } finally {
      inflightSnapshotCache.delete(key);
    }
  })();

  inflightSnapshotCache.set(key, requestPromise);
  return requestPromise;
};

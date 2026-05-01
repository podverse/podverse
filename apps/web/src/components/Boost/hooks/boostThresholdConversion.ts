import {
  convertMinorWithSnapshot,
  resolveCachedConversionSnapshot,
} from './boostConversionSnapshotCache';

export type BoostThresholdConversionContext = {
  preferredCurrency: string | null;
  conversionEndpointUrl: string | null;
};

export type ConvertBoostThresholdAmountParams = {
  sourceCurrency: string;
  sourceAmountMinor: number;
  sourceAmountUnit: string | null | undefined;
  context: BoostThresholdConversionContext;
};

export const convertBoostThresholdAmount = async ({
  sourceCurrency,
  sourceAmountMinor,
  sourceAmountUnit,
  context,
}: ConvertBoostThresholdAmountParams) => {
  const normalizedSourceAmountUnit = sourceAmountUnit?.trim() ?? '';
  const normalizedPreferredCurrency = context.preferredCurrency?.trim() ?? '';
  if (normalizedSourceAmountUnit === '' || normalizedPreferredCurrency === '') {
    return {
      ok: false as const,
      code: 'missing_metadata' as const,
      message: 'source amount unit and preferred currency are required.',
      status: null,
    };
  }
  const snapshotResult = await resolveCachedConversionSnapshot({
    sourceCurrency,
    sourceAmountUnit: normalizedSourceAmountUnit,
    preferredCurrency: normalizedPreferredCurrency,
    conversionEndpointUrl: context.conversionEndpointUrl,
  });
  if (!snapshotResult.ok) {
    return snapshotResult;
  }
  const normalizedSourceAmountMinor = Math.max(0, Math.round(sourceAmountMinor));
  const targetAmountMinor = convertMinorWithSnapshot(
    snapshotResult.snapshot,
    normalizedSourceAmountMinor
  );
  return {
    ok: true as const,
    didSkipNetwork: true,
    source: {
      currency: snapshotResult.snapshot.sourceCurrency,
      amountMinor: normalizedSourceAmountMinor,
      amountUnit: snapshotResult.snapshot.sourceAmountUnit,
    },
    target: {
      currency: snapshotResult.snapshot.targetCurrency,
      amountMinor: targetAmountMinor,
      amountUnit: snapshotResult.snapshot.targetAmountUnit,
    },
    metadata: {
      exchangeRatesFetchedAt: snapshotResult.snapshot.exchangeRatesFetchedAt,
      fiatBaseCurrency: snapshotResult.snapshot.fiatBaseCurrency,
      serverStandardCurrency: snapshotResult.snapshot.serverStandardCurrency,
    },
  };
};

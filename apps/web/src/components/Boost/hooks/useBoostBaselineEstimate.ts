import { useEffect, useState } from 'react';

import { getBoostCurrencyInputSpec } from '@podverse/v4v-metaboost';

import { convertBoostThresholdAmount } from './boostThresholdConversion';

type UseBoostBaselineEstimateParams = {
  sourceAmountMinor: number;
  sourceCurrency: string | null;
  sourceAmountUnit: string | null;
  preferredCurrency: string | null;
  conversionEndpointUrl: string | null;
  locale: string;
  enabled: boolean;
};

const formatBaselineAmountFromMinor = (
  amountMinor: number,
  currencyCode: string,
  locale: string
): string | null => {
  const spec = getBoostCurrencyInputSpec(currencyCode);
  const normalizedCurrency = currencyCode.trim().toUpperCase();
  if (spec === null) {
    return `${amountMinor} ${normalizedCurrency}`;
  }

  const divisor = 10 ** spec.minorUnitExponent;
  const majorAmount = amountMinor / divisor;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: spec.minorUnitExponent === 0 ? 0 : undefined,
      maximumFractionDigits: spec.minorUnitExponent === 0 ? 0 : undefined,
    }).format(majorAmount);
  } catch {
    return `${majorAmount} ${normalizedCurrency}`;
  }
};

export const useBoostBaselineEstimate = ({
  sourceAmountMinor,
  sourceCurrency,
  sourceAmountUnit,
  preferredCurrency,
  conversionEndpointUrl,
  locale,
  enabled,
}: UseBoostBaselineEstimateParams): string | null => {
  const [estimateText, setEstimateText] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setEstimateText(null);
      return;
    }

    const normalizedSourceCurrency = sourceCurrency?.trim().toUpperCase() ?? '';
    const normalizedPreferredCurrency = preferredCurrency?.trim().toUpperCase() ?? '';
    const normalizedAmountUnit = sourceAmountUnit?.trim() ?? '';

    if (
      normalizedSourceCurrency === '' ||
      normalizedPreferredCurrency === '' ||
      normalizedAmountUnit === '' ||
      conversionEndpointUrl === null ||
      conversionEndpointUrl.trim() === '' ||
      normalizedSourceCurrency === normalizedPreferredCurrency
    ) {
      setEstimateText(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await convertBoostThresholdAmount({
          sourceCurrency: normalizedSourceCurrency,
          sourceAmountMinor: Math.max(0, Math.round(sourceAmountMinor)),
          sourceAmountUnit: normalizedAmountUnit,
          context: {
            preferredCurrency: normalizedPreferredCurrency,
            minimumMessageAmountMinor: null,
            conversionEndpointUrl,
          },
        });
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setEstimateText(null);
          return;
        }
        setEstimateText(
          formatBaselineAmountFromMinor(result.target.amountMinor, result.target.currency, locale)
        );
      } catch {
        setEstimateText(null);
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conversionEndpointUrl,
    enabled,
    locale,
    preferredCurrency,
    sourceAmountMinor,
    sourceAmountUnit,
    sourceCurrency,
  ]);

  return estimateText;
};

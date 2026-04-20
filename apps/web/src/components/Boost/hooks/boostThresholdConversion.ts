import { convertPublicBucketAmount } from '@podverse/v4v-metaboost';

export type BoostThresholdConversionContext = {
  preferredCurrency: string | null;
  minimumMessageAmountMinor: number | null;
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
  if (context.conversionEndpointUrl === null || context.conversionEndpointUrl.trim() === '') {
    return {
      ok: false as const,
      code: 'invalid_input' as const,
      message: 'conversion_endpoint_url is required.',
      status: null,
    };
  }

  return convertPublicBucketAmount({
    sourceCurrency,
    sourceAmountMinor,
    amountUnit: sourceAmountUnit,
    conversionEndpointUrl: context.conversionEndpointUrl,
    targetCurrency: context.preferredCurrency,
  });
};

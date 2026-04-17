import {
  isPodverseMetaBoostCurrencySupported,
  resolveMetaBoostStandard,
} from '@podverse/v4v-metaboost';

import type { WebConfig } from '../../config';

export const getAppValueMetaBoost = (config: WebConfig) => {
  const standard = config.public.app_value.metaboost.standard;
  const node = config.public.app_value.metaboost.node;

  const resolved = resolveMetaBoostStandard({
    standard,
    node,
  });
  if (resolved === null) {
    return null;
  }

  const supportsPodverseCurrency = resolved.handler.supportedCurrencies.some((currency) =>
    isPodverseMetaBoostCurrencySupported(currency)
  );
  if (!supportsPodverseCurrency) {
    return null;
  }

  return resolved.metaBoost;
};

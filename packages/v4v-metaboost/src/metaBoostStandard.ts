import type { MetaBoost } from './metaBoost.js';
import { META_BOOST_SCHEMA_MB1, META_BOOST_TYPE_POST, toMetaBoost } from './metaBoost.js';

export const META_BOOST_STANDARD_MB1 = 'mb1' as const;

export const PODVERSE_META_BOOST_CURRENCY_BTC = 'btc' as const;
export const BOOST_EXECUTION_MODE_MB1 = 'mb1' as const;
export const BOOST_EXECUTION_MODE_FALLBACK = 'fallback' as const;

export type BoostExecutionMode =
  | typeof BOOST_EXECUTION_MODE_MB1
  | typeof BOOST_EXECUTION_MODE_FALLBACK;

export type BoostExecutionStrategy = {
  mode: BoostExecutionMode;
  shouldUseMb1: boolean;
  allowBlipFallback: boolean;
};

export type MetaBoostStandardHandler = {
  standard: string;
  supportedCurrencies: readonly string[];
  resolveMetaBoost: (params: { node: string }) => MetaBoost | null;
};

export type ResolvedMetaBoostStandard = {
  normalizedStandard: string;
  metaBoost: MetaBoost;
  handler: MetaBoostStandardHandler;
};

type ResolveMetaBoostStandardParams = {
  standard: string | null | undefined;
  node: string | null | undefined;
};

type MetaBoostLike = {
  standard?: string | null;
  type?: string | null;
  schema?: string | null;
  license?: string | null;
  node?: string | null;
};

const normalizeStandard = (standard: string | null | undefined): string | null => {
  if (typeof standard !== 'string') {
    return null;
  }
  const normalized = standard.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const mb1StandardHandler: MetaBoostStandardHandler = {
  standard: META_BOOST_STANDARD_MB1,
  supportedCurrencies: [PODVERSE_META_BOOST_CURRENCY_BTC],
  resolveMetaBoost: ({ node }) =>
    toMetaBoost(META_BOOST_TYPE_POST, META_BOOST_SCHEMA_MB1, null, node),
};

const standardHandlers: MetaBoostStandardHandler[] = [mb1StandardHandler];

export const isPodverseMetaBoostCurrencySupported = (currency: string): boolean =>
  currency.trim().toLowerCase() === PODVERSE_META_BOOST_CURRENCY_BTC;

export const resolveMetaBoostStandard = (
  params: ResolveMetaBoostStandardParams
): ResolvedMetaBoostStandard | null => {
  const normalizedStandard = normalizeStandard(params.standard);
  if (normalizedStandard === null || typeof params.node !== 'string') {
    return null;
  }

  const handler = standardHandlers.find((value) => value.standard === normalizedStandard);
  if (handler === undefined) {
    return null;
  }

  const metaBoost = handler.resolveMetaBoost({ node: params.node });
  if (metaBoost === null) {
    return null;
  }

  return {
    normalizedStandard,
    metaBoost,
    handler,
  };
};

export const resolveMetaBoostFromValueMetadata = (
  value: MetaBoostLike | null | undefined
): ResolvedMetaBoostStandard | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const standardResolved = resolveMetaBoostStandard({
    standard: value.standard ?? null,
    node: value.node ?? null,
  });
  if (standardResolved !== null) {
    return standardResolved;
  }

  const legacyMetaBoost = toMetaBoost(
    value.type ?? null,
    value.schema ?? null,
    value.license ?? null,
    value.node ?? null
  );
  if (legacyMetaBoost === null) {
    return null;
  }

  if (
    legacyMetaBoost.type === META_BOOST_TYPE_POST &&
    legacyMetaBoost.schema === META_BOOST_SCHEMA_MB1
  ) {
    return {
      normalizedStandard: META_BOOST_STANDARD_MB1,
      metaBoost: legacyMetaBoost,
      handler: mb1StandardHandler,
    };
  }

  return null;
};

export const isMb1MetaBoost = (metaBoost: MetaBoost): boolean =>
  metaBoost.type === META_BOOST_TYPE_POST && metaBoost.schema === META_BOOST_SCHEMA_MB1;

export const resolveBoostExecutionStrategy = (
  metaBoost: MetaBoost | null | undefined
): BoostExecutionStrategy => {
  const shouldUseMb1 = metaBoost !== null && metaBoost !== undefined && isMb1MetaBoost(metaBoost);
  return {
    mode: shouldUseMb1 ? BOOST_EXECUTION_MODE_MB1 : BOOST_EXECUTION_MODE_FALLBACK,
    shouldUseMb1,
    allowBlipFallback: !shouldUseMb1,
  };
};

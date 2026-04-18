import type { MetaBoost } from './metaBoost.js';
import {
  createMetaBoostFromNode,
  META_BOOST_SCHEMA_MB_V1,
  META_BOOST_SCHEMA_MBRSS_V1,
} from './metaBoost.js';

export const META_BOOST_STANDARD_MBRSS_V1 = META_BOOST_SCHEMA_MBRSS_V1;
export const META_BOOST_STANDARD_MB_V1 = META_BOOST_SCHEMA_MB_V1;

export const PODVERSE_META_BOOST_CURRENCY_BTC = 'btc' as const;
export const BOOST_EXECUTION_MODE_MBRSS_V1 = 'mbrss-v1' as const;
export const BOOST_EXECUTION_MODE_MB_V1 = 'mb-v1' as const;
export const BOOST_EXECUTION_MODE_FALLBACK = 'fallback' as const;

export type BoostExecutionMode =
  | typeof BOOST_EXECUTION_MODE_MBRSS_V1
  | typeof BOOST_EXECUTION_MODE_MB_V1
  | typeof BOOST_EXECUTION_MODE_FALLBACK;

export type BoostExecutionStrategy = {
  mode: BoostExecutionMode;
  shouldUseMbrssV1: boolean;
  shouldUseMbV1: boolean;
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

/**
 * RSS `<podcast:metaBoost>` tag fields as parsed by Partytime (`PhasePendingMetaBoost`):
 * `standard` attribute + normalized `node` URL text — see `partytime` `phase-pending.ts` `metaBoost`.
 */
export type MetaBoostTagFields = {
  standard?: string | null;
  node?: string | null;
};

/**
 * Maps `{ standard, node }` from `DTOChannel.channel_meta_boost` (API/ORM relation payload) to
 * {@link MetaBoostTagFields}.
 */
export const metaBoostTagFieldsFromApiDto = (
  dto: { standard?: string | null; node?: string | null } | null | undefined
): MetaBoostTagFields | null => {
  if (dto === null || dto === undefined) {
    return null;
  }
  const node = typeof dto.node === 'string' && dto.node.trim() !== '' ? dto.node : null;
  const standardRaw =
    typeof dto.standard === 'string' && dto.standard.trim() !== '' ? dto.standard.trim() : null;
  if (standardRaw === null || node === null) {
    return null;
  }
  return { standard: standardRaw, node };
};

const normalizeStandard = (standard: string | null | undefined): string | null => {
  if (typeof standard !== 'string') {
    return null;
  }
  const normalized = standard.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const mbrssV1StandardHandler: MetaBoostStandardHandler = {
  standard: META_BOOST_STANDARD_MBRSS_V1,
  supportedCurrencies: [PODVERSE_META_BOOST_CURRENCY_BTC],
  resolveMetaBoost: ({ node }) => createMetaBoostFromNode(node),
};

const mbV1StandardHandler: MetaBoostStandardHandler = {
  standard: META_BOOST_STANDARD_MB_V1,
  supportedCurrencies: [PODVERSE_META_BOOST_CURRENCY_BTC],
  resolveMetaBoost: ({ node }) => createMetaBoostFromNode(node),
};

const standardHandlers: MetaBoostStandardHandler[] = [mbrssV1StandardHandler, mbV1StandardHandler];

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

  const standard: 'mbrss-v1' | 'mb-v1' =
    normalizedStandard === META_BOOST_STANDARD_MB_V1 ? 'mb-v1' : 'mbrss-v1';

  return {
    normalizedStandard,
    metaBoost: { ...metaBoost, standard },
    handler,
  };
};

/**
 * Resolve a supported MetaBoost standard from RSS tag fields only (Partytime `PhasePendingMetaBoost`).
 * For Podverse API `channel_meta_boost` on a channel (same `{ standard, node }` shape), use
 * {@link metaBoostTagFieldsFromApiDto} or {@link resolveMetaBoostFromApiValueMetadata}.
 */
export const resolveMetaBoostFromValueMetadata = (
  value: MetaBoostTagFields | null | undefined
): ResolvedMetaBoostStandard | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return resolveMetaBoostStandard({
    standard: value.standard ?? null,
    node: value.node ?? null,
  });
};

/**
 * Convenience: `channel_meta_boost`-shaped JSON from API or storage (`standard` + `node`) → resolved
 * standard (see {@link metaBoostTagFieldsFromApiDto}). Used for `DTOChannel.channel_meta_boost`, not
 * per-value rows.
 */
export const resolveMetaBoostFromApiValueMetadata = (
  dto: { standard?: string | null; node?: string | null } | null | undefined
): ResolvedMetaBoostStandard | null => {
  const fields = metaBoostTagFieldsFromApiDto(dto);
  if (fields === null) {
    return null;
  }
  return resolveMetaBoostFromValueMetadata(fields);
};

export const isMbrssV1MetaBoost = (metaBoost: MetaBoost | null | undefined): boolean =>
  Boolean(metaBoost?.node);

export const resolveBoostExecutionStrategy = (
  metaBoost: MetaBoost | null | undefined
): BoostExecutionStrategy => {
  if (metaBoost === null || metaBoost === undefined || !isMbrssV1MetaBoost(metaBoost)) {
    return {
      mode: BOOST_EXECUTION_MODE_FALLBACK,
      shouldUseMbrssV1: false,
      shouldUseMbV1: false,
      allowBlipFallback: true,
    };
  }

  const nodeStr = typeof metaBoost.node === 'string' ? metaBoost.node : '';
  const isMbV1 = metaBoost.standard === 'mb-v1' || nodeStr.includes('/standard/mb-v1/');
  if (isMbV1) {
    return {
      mode: BOOST_EXECUTION_MODE_MB_V1,
      shouldUseMbrssV1: false,
      shouldUseMbV1: true,
      allowBlipFallback: false,
    };
  }

  const shouldUseMbrssV1 =
    metaBoost.standard === 'mbrss-v1' ||
    nodeStr.includes('/standard/mbrss-v1/') ||
    (metaBoost.standard === undefined && !nodeStr.includes('/standard/mb-v1/'));

  return {
    mode: shouldUseMbrssV1 ? BOOST_EXECUTION_MODE_MBRSS_V1 : BOOST_EXECUTION_MODE_FALLBACK,
    shouldUseMbrssV1,
    shouldUseMbV1: false,
    allowBlipFallback: !shouldUseMbrssV1,
  };
};

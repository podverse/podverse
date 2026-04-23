import { resolveMetaBoostStandard } from '@podverse/v4v-metaboost';

import type { PhasePendingMetaBoost } from '../../types/partytime.js';

/**
 * Map Partytime channel-level `podcast:metaBoost` (`PhasePendingMetaBoost`) to Podverse
 * DTO-shaped `meta_boost` (`standard` + normalized `node`); persisted as `channel_meta_boost` (FK to `channel`).
 */
export const compatChannelMetaBoost = (metaBoost?: PhasePendingMetaBoost | null) => {
  if (metaBoost === null || metaBoost === undefined) {
    return null;
  }
  const resolved = resolveMetaBoostStandard({
    standard: metaBoost.standard,
    node: metaBoost.node,
  });
  if (resolved === null) {
    return null;
  }
  return {
    standard: metaBoost.standard.trim(),
    node: resolved.metaBoost.node,
  };
};

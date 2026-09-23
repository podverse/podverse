import type { DTOChannel } from '@podverse/helpers';

import type { MetaBoost } from './metaBoost.js';
import { resolveMetaBoostFromApiValueMetadata } from './metaBoostStandard.js';

export type BoostEligibilityChannel = {
  channel_meta_boost?: DTOChannel['channel_meta_boost'];
  channel_values?: DTOChannel['channel_values'];
  podcast_guid?: string | null;
};

export type BoostEligibilityItem = {
  guid?: string | null;
};

type BoostEligibilityInput = {
  channel: BoostEligibilityChannel | null;
  item?: BoostEligibilityItem | null;
  itemGuid?: string | null;
};

export type MbrssMessagesScope =
  { type: 'channel'; podcastGuid: string } | { type: 'item'; itemGuid: string };

export type BoostEligibility = {
  canShowBoostAction: boolean;
  canShowBoostMessagesTab: boolean;
  resolvedStandard: MetaBoost['standard'] | null;
  resolvedMetaBoost: MetaBoost | null;
  mbrssMessagesScope: MbrssMessagesScope | null;
};

/**
 * Whether a channel can offer a boost. Item values do not turn the action on by themselves.
 * The action requires channel value rows and a MetaBoost standard of `mbrss-v1` or `mb-v1`.
 */
export const getBoostEligibilityForContent = ({
  channel,
  item = null,
  itemGuid = null,
}: BoostEligibilityInput): BoostEligibility => {
  const resolvedMetaBoost = resolveMetaBoostFromApiValueMetadata(
    channel?.channel_meta_boost ?? null
  );
  const resolvedStandard = resolvedMetaBoost?.metaBoost.standard ?? null;
  const hasMbrssV1MetaBoost = resolvedStandard === 'mbrss-v1';
  const canSendBoostForResolvedStandard =
    resolvedStandard === 'mbrss-v1' || resolvedStandard === 'mb-v1';
  const resolvedItemGuid = item?.guid ?? itemGuid;
  const mbrssMessagesScope: MbrssMessagesScope | null =
    hasMbrssV1MetaBoost === false
      ? null
      : resolvedItemGuid === null || resolvedItemGuid === undefined || resolvedItemGuid === ''
        ? channel?.podcast_guid
          ? { type: 'channel', podcastGuid: channel.podcast_guid }
          : null
        : { type: 'item', itemGuid: resolvedItemGuid };
  const hasValueTag = (channel?.channel_values?.length ?? 0) > 0;

  return {
    canShowBoostAction: hasValueTag && canSendBoostForResolvedStandard,
    canShowBoostMessagesTab: mbrssMessagesScope !== null,
    resolvedStandard,
    resolvedMetaBoost: resolvedMetaBoost?.metaBoost ?? null,
    mbrssMessagesScope,
  };
};

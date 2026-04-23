import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import { resolveMetaBoostFromApiValueMetadata } from '@podverse/v4v-metaboost';

type BoostEligibilityInput = {
  channel: DTOChannel | null;
  item?: DTOItem | null;
  itemGuid?: string | null;
};

export type MbrssMessagesScope =
  | { type: 'channel'; podcastGuid: string }
  | { type: 'item'; itemGuid: string };

export type BoostEligibility = {
  canShowBoostAction: boolean;
  canShowBoostMessagesTab: boolean;
  resolvedStandard: MetaBoost['standard'] | null;
  resolvedMetaBoost: MetaBoost | null;
  mbrssMessagesScope: MbrssMessagesScope | null;
};

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

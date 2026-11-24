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

export type BoostEligibilityRecipient = {
  type: string;
};

export type BoostEligibilityValueBlock = {
  type: string;
  channel_value_recipients?: readonly BoostEligibilityRecipient[] | null;
  item_value_recipients?: readonly BoostEligibilityRecipient[] | null;
};

type BoostEligibilityInput = {
  channel: BoostEligibilityChannel | null;
  item?: BoostEligibilityItem | null;
  itemGuid?: string | null;
  /**
   * Non-empty: the lightning check uses this list.
   * Empty or omitted: the lightning check uses channel_values.
   */
  itemValues?: readonly BoostEligibilityValueBlock[] | null;
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

const normalizedType = (value: string): string => value.trim().toLowerCase();

const recipientsOf = (block: BoostEligibilityValueBlock): readonly BoostEligibilityRecipient[] => {
  if (block.channel_value_recipients !== null && block.channel_value_recipients !== undefined) {
    return block.channel_value_recipients;
  }
  if (block.item_value_recipients !== null && block.item_value_recipients !== undefined) {
    return block.item_value_recipients;
  }
  return [];
};

const listHasLightningNodeOrLnaddress = (
  blocks: readonly BoostEligibilityValueBlock[] | null | undefined
): boolean =>
  (blocks ?? []).some((block) => {
    if (normalizedType(block.type) !== 'lightning') {
      return false;
    }
    return recipientsOf(block).some((recipient) => {
      const recipientType = normalizedType(recipient.type);
      return recipientType === 'node' || recipientType === 'lnaddress';
    });
  });

/**
 * The boost action shows when the effective value list has a lightning recipient
 * of type `node` or `lnaddress`, or when the channel has any value row and a
 * MetaBoost standard of `mbrss-v1` or `mb-v1`.
 * The effective list is `itemValues` when that array is non-empty, and the channel
 * value rows otherwise.
 * The public message list still requires `mbrss-v1`.
 */
export const getBoostEligibilityForContent = ({
  channel,
  item = null,
  itemGuid = null,
  itemValues = null,
}: BoostEligibilityInput): BoostEligibility => {
  const resolvedMetaBoost = resolveMetaBoostFromApiValueMetadata(
    channel?.channel_meta_boost ?? null
  );
  const resolvedStandard = resolvedMetaBoost?.metaBoost.standard ?? null;
  const hasMbrssV1MetaBoost = resolvedStandard === 'mbrss-v1';
  const itemList = itemValues ?? [];
  const channelList = channel?.channel_values ?? [];
  const effectiveList = itemList.length > 0 ? itemList : channelList;
  const hasLightningRecipient = listHasLightningNodeOrLnaddress(effectiveList);
  const hasChannelValueRow = channelList.length > 0;
  const hasSupportedMetaBoost = resolvedStandard === 'mbrss-v1' || resolvedStandard === 'mb-v1';
  const resolvedItemGuid = item?.guid ?? itemGuid;
  const mbrssMessagesScope: MbrssMessagesScope | null =
    hasMbrssV1MetaBoost === false
      ? null
      : resolvedItemGuid === null || resolvedItemGuid === undefined || resolvedItemGuid === ''
        ? channel?.podcast_guid
          ? { type: 'channel', podcastGuid: channel.podcast_guid }
          : null
        : { type: 'item', itemGuid: resolvedItemGuid };

  return {
    canShowBoostAction: hasLightningRecipient || (hasChannelValueRow && hasSupportedMetaBoost),
    canShowBoostMessagesTab: mbrssMessagesScope !== null,
    resolvedStandard,
    resolvedMetaBoost: resolvedMetaBoost?.metaBoost ?? null,
    mbrssMessagesScope,
  };
};

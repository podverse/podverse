import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type {
  AddByRSSFeedRecordWithMapped,
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
} from '@podverse/parser-mapping';
import { buildAddByRssBoostChannel, buildAddByRssBoostItem } from '@podverse/parser-mapping';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

export type PlayerBoostTarget = {
  channel: DTOChannel;
  item: DTOItem | null;
};

/** The stored channel has no `channel_values` array yet. An empty array is already loaded. */
export const databaseChannelNeedsFetch = (channel: DTOChannel): boolean =>
  !Array.isArray(channel.channel_values);

/** The stored item has no `item_values` array yet. Null and an empty array are already settled. */
export const databaseItemNeedsFetch = (item: DTOItem | null): boolean => {
  if (item === null) {
    return false;
  }
  return !Array.isArray(item.item_values);
};

export const boostTargetFromRecords = (
  channel: DTOChannel,
  item: DTOItem | null
): PlayerBoostTarget | null => {
  const { canShowBoostAction } = getBoostEligibilityForContent({
    channel,
    item,
    ...(item !== null && item !== undefined ? { itemValues: item.item_values } : {}),
  });
  if (!canShowBoostAction) {
    return null;
  }
  return { channel, item };
};

export const boostTargetFromAddByRss = (
  feed: AddByRSSFeedRecordWithMapped | null,
  indexItem: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem | null
): PlayerBoostTarget | null => {
  if (feed === null) {
    return null;
  }
  const channel = buildAddByRssBoostChannel(feed);
  if (channel === null) {
    return null;
  }
  const item = indexItem === null ? null : buildAddByRssBoostItem(indexItem);
  return boostTargetFromRecords(channel, item);
};

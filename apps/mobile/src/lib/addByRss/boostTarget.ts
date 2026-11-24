import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';
import {
  buildAddByRssBoostChannel,
  buildAddByRssBoostSheetItem,
  compatItemImageDtos,
  compatItemValueDtos,
} from '@podverse/parser-mapping';

import type { BoostSheetTarget } from '../../components/boost/BoostSheet';

const nonEmptyItemKey = (itemKey: string | null): itemKey is string =>
  itemKey !== null && itemKey.length > 0;

/**
 * Settled boost sheet target for an Add by RSS feed on this device.
 * A live item wins over an episode or track. A channel screen passes both items as null.
 */
export function boostTargetFromMappedFeed(input: {
  feed: {
    id: number;
    idText: string;
    feedUrl: string;
    title: string | null;
    imageUrl: string | null;
  };
  item: AddByRSSMappedFeed['items'][number] | null;
  itemKey: string | null;
  liveItem: AddByRSSMappedFeed['liveItems'][number] | null;
  mappedFeed: AddByRSSMappedFeed;
}): BoostSheetTarget | null {
  const channel = buildAddByRssBoostChannel({ ...input.feed, mappedFeed: input.mappedFeed });
  if (channel === null) {
    return null;
  }

  const addByRssBase = { feedIdText: input.feed.idText, feedUrl: input.feed.feedUrl };

  if (input.liveItem !== null) {
    if (!nonEmptyItemKey(input.itemKey)) {
      return null;
    }
    const trimmedGuid = input.liveItem.item.guid.trim();
    return {
      addByRss: { ...addByRssBase, itemKey: input.itemKey },
      channel,
      item: buildAddByRssBoostSheetItem({
        guid: trimmedGuid.length > 0 ? trimmedGuid : null,
        idText: input.itemKey,
        images: compatItemImageDtos(input.liveItem.item),
        title: input.liveItem.item.title ?? null,
        values: compatItemValueDtos(input.liveItem.item),
      }),
    };
  }

  if (input.item !== null) {
    if (!nonEmptyItemKey(input.itemKey)) {
      return null;
    }
    return {
      addByRss: { ...addByRssBase, itemKey: input.itemKey },
      channel,
      item: buildAddByRssBoostSheetItem({
        guid: input.item.item.guid,
        idText: input.itemKey,
        images: input.item.images,
        title: input.item.item.title,
        values: input.item.value,
      }),
    };
  }

  return {
    addByRss: { ...addByRssBase, itemKey: null },
    channel,
    item: null,
  };
}
